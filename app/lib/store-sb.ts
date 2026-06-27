// Relational Supabase backend for the store. Replaces the single-blob model with
// per-row tables (accounts, tables, transactions, menus, settings, leads,
// login_attempts) so reads/writes touch only the rows they need and concurrent
// payments on different tables no longer serialize on one blob.
//
// Concurrency: each `tables` row carries a `version`; table mutations are a
// compare-and-swap UPDATE (… WHERE num=? AND version=?). A lost CAS re-reads and
// retries. Other tables use last-write-wins or are naturally single-row.
//
// store.ts dispatches here when SUPABASE_URL is set; otherwise it uses the disk
// blob fallback. Domain logic (payment math, settings merge) lives in
// store-core.ts so the two backends never drift.

import { constantTimeEqual, hashPassword } from "./auth";
import { sb } from "./supabase";
import {
  applyPayment,
  clampHold,
  coerceSettings,
  mergeSettings,
  newToken,
  nextStatusForItems,
  orderAmount,
  pruneReservations,
  zeros,
} from "./store-core";
import type {
  AccountSource,
  AdminUser,
  Lead,
  LiveTable,
  MenuMeta,
  OrderItem,
  RestaurantSettings,
  TableStatus,
  Transaction,
} from "./types";

const MAX_TXN_HISTORY = 1000;
const MAX_LEADS = 1000;
const MAX_CAS_RETRIES = 6;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Row ⇄ domain mappers
// ---------------------------------------------------------------------------

type TableRow = {
  num: number | string;
  owner: string;
  token: string;
  status: TableStatus;
  amount: string;
  items: OrderItem[] | null;
  paid: number | string | null;
  paid_qty: number[] | null;
  reservations: LiveTable["reservations"] | null;
  version: number | string | null;
};

function rowToTable(r: TableRow): LiveTable {
  const items = Array.isArray(r.items) ? r.items : [];
  const pq = Array.isArray(r.paid_qty) ? r.paid_qty : [];
  return {
    num: String(r.num),
    owner: r.owner,
    token: r.token,
    status: r.status,
    amount: r.amount,
    items,
    paid: Number(r.paid) || 0,
    paidQty: items.map((_, i) => (typeof pq[i] === "number" ? pq[i] : 0)),
    reservations: Array.isArray(r.reservations) ? r.reservations : [],
  };
}

type AccountRow = {
  id: string;
  email: string;
  password_hash: string;
  role: "super" | "admin";
  created_at: string;
  expires_at: string | null;
  source: AccountSource | null;
};

function rowToUser(r: AccountRow): AdminUser {
  return {
    id: r.id,
    email: r.email,
    passwordHash: r.password_hash,
    role: r.role,
    createdAt: r.created_at,
    expiresAt: r.expires_at ?? null,
    source: r.source ?? "manual",
  };
}

// ---------------------------------------------------------------------------
// Bootstrap: ensure the super account exists (first boot)
// ---------------------------------------------------------------------------

const SUPER_EMAIL = (process.env.SUPERADMIN_EMAIL || "AliTheAdmin@gmail.com")
  .trim()
  .toLowerCase();
const SUPER_PASSWORD = process.env.SUPERADMIN_PASSWORD || "QPayAdmin_1";

let superEnsured = false;

/** Inject the super account once if no super row exists. Fail-closed in prod. */
export async function ensureSuperadmin(): Promise<void> {
  if (superEnsured) return;
  const client = await sb();
  const { data, error } = await client
    .from("accounts")
    .select("id")
    .eq("role", "super")
    .limit(1);
  if (error) throw new Error(`store: accounts read failed — ${error.message}`);
  if (data && data.length > 0) {
    superEnsured = true;
    return;
  }
  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.SUPERADMIN_EMAIL || !process.env.SUPERADMIN_PASSWORD)
  ) {
    throw new Error(
      "SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set in production to seed the super account",
    );
  }
  // Insert; ignore a duplicate (a concurrent boot may have won the race).
  await client.from("accounts").insert({
    email: SUPER_EMAIL,
    password_hash: await hashPassword(SUPER_PASSWORD),
    role: "super",
    source: "manual",
    expires_at: null,
  });
  superEnsured = true;
}

// ---------------------------------------------------------------------------
// Settings (per owner)
// ---------------------------------------------------------------------------

async function settingsRow(owner: string): Promise<RestaurantSettings> {
  const client = await sb();
  const { data, error } = await client
    .from("settings")
    .select("name, tax_rate, auto_receipts, tip_prompts")
    .eq("owner", owner)
    .maybeSingle();
  if (error) throw new Error(`store: settings read failed — ${error.message}`);
  return coerceSettings(
    data
      ? {
          name: data.name,
          taxRate: Number(data.tax_rate),
          autoReceipts: data.auto_receipts,
          tipPrompts: data.tip_prompts,
        }
      : null,
  );
}

export async function getSettings(owner: string): Promise<RestaurantSettings> {
  return settingsRow(owner);
}

export async function setSettings(
  owner: string,
  patch: Partial<RestaurantSettings>,
): Promise<RestaurantSettings> {
  const cur = await settingsRow(owner);
  const next = mergeSettings(cur, patch);
  const client = await sb();
  const { error } = await client.from("settings").upsert(
    {
      owner,
      name: next.name,
      tax_rate: next.taxRate,
      auto_receipts: next.autoReceipts,
      tip_prompts: next.tipPrompts,
    },
    { onConflict: "owner" },
  );
  if (error) throw new Error(`store: settings write failed — ${error.message}`);
  return next;
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export async function listTables(owner: string): Promise<LiveTable[]> {
  const client = await sb();
  const { data, error } = await client
    .from("tables")
    .select("*")
    .eq("owner", owner)
    .order("num", { ascending: true });
  if (error) throw new Error(`store: tables read failed — ${error.message}`);
  return (data ?? []).map((r) => rowToTable(r as TableRow));
}

export async function getTable(num: string): Promise<LiveTable | null> {
  const client = await sb();
  const { data, error } = await client
    .from("tables")
    .select("*")
    .eq("num", Number(num))
    .maybeSingle();
  if (error) throw new Error(`store: table read failed — ${error.message}`);
  return data ? rowToTable(data as TableRow) : null;
}

/** Internal: fetch a raw row incl. version for CAS. */
async function rawTable(num: string): Promise<TableRow | null> {
  const client = await sb();
  const { data, error } = await client
    .from("tables")
    .select("*")
    .eq("num", Number(num))
    .maybeSingle();
  if (error) throw new Error(`store: table read failed — ${error.message}`);
  return (data as TableRow) ?? null;
}

/**
 * Compare-and-swap a table update. `apply` mutates a fresh LiveTable copy and
 * returns the fields to write plus optional side effects (a ledger txn). Retries
 * on a lost CAS. Returns the updated table, or null if `apply` signals not-found
 * / no-op.
 */
async function casTable(
  num: string,
  apply: (
    t: LiveTable,
    ctx: { taxRate: number },
  ) => Promise<{ write: boolean; txn?: Transaction | null }> | {
    write: boolean;
    txn?: Transaction | null;
  },
): Promise<LiveTable | null> {
  const client = await sb();
  for (let attempt = 0; ; attempt++) {
    const row = await rawTable(num);
    if (!row) return null;
    const version = Number(row.version) || 0;
    const t = rowToTable(row);
    const taxRate = (await settingsRow(t.owner)).taxRate;
    const res = await apply(t, { taxRate });
    if (!res.write) return t;

    const { data, error } = await client
      .from("tables")
      .update({
        owner: t.owner,
        token: t.token,
        status: t.status,
        amount: t.amount,
        items: t.items,
        paid: t.paid,
        paid_qty: t.paidQty,
        reservations: t.reservations,
        version: version + 1,
      })
      .eq("num", Number(num))
      .eq("version", version)
      .select("num");
    if (error) throw new Error(`store: table CAS failed — ${error.message}`);
    if ((data?.length ?? 0) > 0) {
      if (res.txn) await insertTxn(res.txn);
      return t;
    }
    // Lost the CAS — another writer advanced the row. Retry.
    if (attempt >= MAX_CAS_RETRIES) {
      throw new Error("store: table write conflict (max retries exceeded)");
    }
    await sleep(15 * (attempt + 1));
  }
}

export async function createTable(owner: string): Promise<LiveTable> {
  const client = await sb();
  // next_table_num() is an RPC over a Postgres sequence → monotonic, never reused.
  const { data: numData, error: numErr } = await client.rpc("next_table_num");
  if (numErr) throw new Error(`store: num alloc failed — ${numErr.message}`);
  const num = Number(numData);
  const table: LiveTable = {
    num: String(num),
    owner,
    token: newToken(),
    status: "open",
    amount: "—",
    items: [],
    paid: 0,
    paidQty: [],
    reservations: [],
  };
  const { error } = await client.from("tables").insert({
    num,
    owner,
    token: table.token,
    status: table.status,
    amount: table.amount,
    items: [],
    paid: 0,
    paid_qty: [],
    reservations: [],
    version: 0,
  });
  if (error) throw new Error(`store: table create failed — ${error.message}`);
  return table;
}

export async function setTableItems(
  num: string,
  items: OrderItem[],
  owner: string,
): Promise<LiveTable | null> {
  return casTable(num, (t, { taxRate }) => {
    if (t.owner !== owner) return { write: false };
    t.items = items;
    t.amount = orderAmount(items, taxRate);
    // Editing the order resets per-item locks, holds, and carried principal.
    t.paidQty = zeros(items.length);
    t.reservations = [];
    t.paid = 0;
    t.status = nextStatusForItems(items);
    return { write: true };
  });
}

export async function syncReservation(
  num: string,
  id: string,
  qty: number[],
  token: string,
): Promise<LiveTable | null> {
  // Token gate happens against the freshly-read row inside the CAS.
  return casTable(num, (t) => {
    if (!constantTimeEqual(t.token, token)) return { write: false };
    const others = pruneReservations(t.reservations).filter((r) => r.id !== id);
    const mine = clampHold(t.items, qty);
    t.reservations = mine.some((n) => n > 0)
      ? [...others, { id, qty: mine, ts: Date.now() }]
      : others;
    return { write: true };
  });
}

export async function payTable(
  num: string,
  amount: number,
  opts: { id?: string; items?: number[]; method?: string; token: string },
): Promise<LiveTable | null> {
  return casTable(num, (t, { taxRate }) => {
    if (!constantTimeEqual(t.token, opts.token)) return { write: false };
    if (t.items.length === 0) return { write: false };
    const { txn } = applyPayment(t, amount, opts, taxRate);
    return { write: true, txn };
  });
}

export async function setTableStatus(
  num: string,
  status: TableStatus,
  owner: string,
): Promise<LiveTable | null> {
  return casTable(num, (t) => {
    if (t.owner !== owner) return { write: false };
    t.status = status;
    if (status === "open") t.amount = "—";
    else if (t.amount === "—") t.amount = "$0";
    return { write: true };
  });
}

export async function deleteTable(
  num: string,
  owner: string,
): Promise<boolean> {
  const client = await sb();
  const { data, error } = await client
    .from("tables")
    .delete()
    .eq("num", Number(num))
    .eq("owner", owner)
    .select("num");
  if (error) throw new Error(`store: table delete failed — ${error.message}`);
  return (data?.length ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Transactions (ledger)
// ---------------------------------------------------------------------------

async function insertTxn(txn: Transaction): Promise<void> {
  const client = await sb();
  const { error } = await client.from("transactions").insert({
    owner: txn.owner,
    table_num: Number(txn.table),
    time: txn.time,
    amount: txn.amount,
    method: txn.method,
  });
  if (error) throw new Error(`store: txn write failed — ${error.message}`);
}

export async function listTransactions(owner: string): Promise<Transaction[]> {
  const client = await sb();
  const { data, error } = await client
    .from("transactions")
    .select("owner, table_num, time, amount, method, created_at")
    .eq("owner", owner)
    .order("created_at", { ascending: false })
    .limit(MAX_TXN_HISTORY);
  if (error) throw new Error(`store: txns read failed — ${error.message}`);
  return (data ?? []).map((r) => ({
    time: r.time,
    table: String(r.table_num),
    amount: r.amount,
    method: r.method,
    owner: r.owner,
  }));
}

// ---------------------------------------------------------------------------
// Accounts (login)
// ---------------------------------------------------------------------------

export async function findUserByEmail(
  email: string,
): Promise<AdminUser | null> {
  const norm = email.trim().toLowerCase();
  const client = await sb();
  const { data, error } = await client
    .from("accounts")
    .select("*")
    .eq("email", norm)
    .maybeSingle();
  if (error) throw new Error(`store: account read failed — ${error.message}`);
  return data ? rowToUser(data as AccountRow) : null;
}

export async function getUserById(id: string): Promise<AdminUser | null> {
  const client = await sb();
  const { data, error } = await client
    .from("accounts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`store: account read failed — ${error.message}`);
  return data ? rowToUser(data as AccountRow) : null;
}

export async function listAdmins(): Promise<AdminUser[]> {
  const client = await sb();
  const { data, error } = await client
    .from("accounts")
    .select("*")
    .eq("role", "admin")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`store: accounts read failed — ${error.message}`);
  return (data ?? []).map((r) => rowToUser(r as AccountRow));
}

export async function createAdmin(
  email: string,
  passwordHash: string,
  opts?: { source?: AccountSource; expiresAt?: string | null },
): Promise<AdminUser | null> {
  const norm = email.trim().toLowerCase();
  const client = await sb();
  const { data, error } = await client
    .from("accounts")
    .insert({
      email: norm,
      password_hash: passwordHash,
      role: "admin",
      source: opts?.source ?? "manual",
      expires_at: opts?.expiresAt ?? null,
    })
    .select("*")
    .maybeSingle();
  if (error) {
    // Unique-violation on email → already taken.
    if (error.code === "23505") return null;
    throw new Error(`store: account create failed — ${error.message}`);
  }
  return data ? rowToUser(data as AccountRow) : null;
}

export async function deleteAdmin(id: string): Promise<boolean> {
  const client = await sb();
  // Cascade (tables/transactions/menus/settings) is enforced by FK ON DELETE
  // CASCADE; the super account can't be deleted (role filter).
  const { data, error } = await client
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("role", "admin")
    .select("id");
  if (error) throw new Error(`store: account delete failed — ${error.message}`);
  return (data?.length ?? 0) > 0;
}

/** Extend an admin's expiry by `days` from max(now, current expiry). */
export async function renewAdmin(
  id: string,
  days: number,
): Promise<AdminUser | null> {
  const client = await sb();
  const { data: cur, error: readErr } = await client
    .from("accounts")
    .select("*")
    .eq("id", id)
    .eq("role", "admin")
    .maybeSingle();
  if (readErr) throw new Error(`store: account read failed — ${readErr.message}`);
  if (!cur) return null;
  const base = Math.max(
    Date.now(),
    cur.expires_at ? new Date(cur.expires_at).getTime() : Date.now(),
  );
  const expiresAt = new Date(base + days * 86_400_000).toISOString();
  const { data, error } = await client
    .from("accounts")
    .update({ expires_at: expiresAt })
    .eq("id", id)
    .eq("role", "admin")
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`store: renew failed — ${error.message}`);
  return data ? rowToUser(data as AccountRow) : null;
}

/** Set an admin's absolute expiry (used by trial provisioning). */
export async function setAdminExpiry(
  id: string,
  iso: string | null,
): Promise<void> {
  const client = await sb();
  const { error } = await client
    .from("accounts")
    .update({ expires_at: iso })
    .eq("id", id)
    .eq("role", "admin");
  if (error) throw new Error(`store: set expiry failed — ${error.message}`);
}

/** Edit an admin's email and/or password hash. Returns null if not found; throws on dup email. */
export async function updateAdmin(
  id: string,
  patch: { email?: string; passwordHash?: string },
): Promise<AdminUser | null | "duplicate"> {
  const client = await sb();
  const fields: Record<string, unknown> = {};
  if (typeof patch.email === "string") fields.email = patch.email.trim().toLowerCase();
  if (typeof patch.passwordHash === "string") fields.password_hash = patch.passwordHash;
  if (Object.keys(fields).length === 0) return getUserById(id);
  const { data, error } = await client
    .from("accounts")
    .update(fields)
    .eq("id", id)
    .eq("role", "admin")
    .select("*")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") return "duplicate";
    throw new Error(`store: account update failed — ${error.message}`);
  }
  return data ? rowToUser(data as AccountRow) : null;
}

// ---------------------------------------------------------------------------
// Login throttling
// ---------------------------------------------------------------------------

const LOGIN_MAX_FAILS = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

export async function isLoginLocked(key: string): Promise<boolean> {
  const client = await sb();
  const { data, error } = await client
    .from("login_attempts")
    .select("locked_until")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(`store: lock read failed — ${error.message}`);
  return !!data && Number(data.locked_until) > Date.now();
}

export async function recordLoginFailure(key: string): Promise<void> {
  const client = await sb();
  const now = Date.now();
  const { data } = await client
    .from("login_attempts")
    .select("fails, window_end, locked_until")
    .eq("key", key)
    .maybeSingle();
  const inWindow = data && now < Number(data.window_end);
  const fails = inWindow ? Number(data!.fails) + 1 : 1;
  const windowEnd = inWindow ? Number(data!.window_end) : now + LOGIN_WINDOW_MS;
  const lockedUntil = fails >= LOGIN_MAX_FAILS ? now + LOGIN_LOCK_MS : 0;
  const { error } = await client.from("login_attempts").upsert(
    { key, fails, window_end: windowEnd, locked_until: lockedUntil },
    { onConflict: "key" },
  );
  if (error) throw new Error(`store: lock write failed — ${error.message}`);
  // Opportunistic prune of fully-expired rows.
  await client
    .from("login_attempts")
    .delete()
    .lt("locked_until", now)
    .lt("window_end", now);
}

export async function clearLoginFailures(key: string): Promise<void> {
  const client = await sb();
  const { error } = await client.from("login_attempts").delete().eq("key", key);
  if (error) throw new Error(`store: lock clear failed — ${error.message}`);
}

// ---------------------------------------------------------------------------
// Menus
// ---------------------------------------------------------------------------

function rowToMenu(r: {
  filename: string;
  url: string;
  mime: string;
  original_name: string;
  uploaded_at: string;
}): MenuMeta {
  return {
    filename: r.filename,
    url: r.url,
    mime: r.mime,
    originalName: r.original_name,
    uploadedAt: r.uploaded_at,
  };
}

export async function getMenu(owner: string): Promise<MenuMeta | null> {
  const client = await sb();
  const { data, error } = await client
    .from("menus")
    .select("*")
    .eq("owner", owner)
    .maybeSingle();
  if (error) throw new Error(`store: menu read failed — ${error.message}`);
  return data ? rowToMenu(data) : null;
}

export async function getMenuForTable(
  num: string,
  token: string,
): Promise<MenuMeta | null> {
  const t = await rawTable(num);
  if (!t || !constantTimeEqual(t.token, token)) return null;
  return getMenu(t.owner);
}

export async function setMenu(owner: string, meta: MenuMeta): Promise<void> {
  const client = await sb();
  const { error } = await client.from("menus").upsert(
    {
      owner,
      filename: meta.filename,
      url: meta.url,
      mime: meta.mime,
      original_name: meta.originalName,
      uploaded_at: meta.uploadedAt,
    },
    { onConflict: "owner" },
  );
  if (error) throw new Error(`store: menu write failed — ${error.message}`);
}

export async function clearMenu(owner: string): Promise<void> {
  const client = await sb();
  const { error } = await client.from("menus").delete().eq("owner", owner);
  if (error) throw new Error(`store: menu clear failed — ${error.message}`);
}

// ---------------------------------------------------------------------------
// Public restaurant info
// ---------------------------------------------------------------------------

export async function getPublicRestaurant(
  num: string,
): Promise<{ name: string; taxRate: number } | null> {
  const t = await rawTable(num);
  if (!t) return null;
  const set = await settingsRow(t.owner);
  const user = await getUserById(t.owner);
  const fallback = user ? user.email.split("@")[0] : "Restaurant";
  return { name: set.name || fallback, taxRate: set.taxRate };
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export async function addLead(input: {
  name: string;
  email: string;
  restaurant: string;
}): Promise<Lead> {
  const client = await sb();
  const lead = {
    name: input.name.trim().slice(0, 120),
    email: input.email.trim().slice(0, 200),
    restaurant: input.restaurant.trim().slice(0, 120),
  };
  const { data, error } = await client
    .from("leads")
    .insert(lead)
    .select("*")
    .single();
  if (error) throw new Error(`store: lead write failed — ${error.message}`);
  // Best-effort cap: trim rows beyond MAX_LEADS (newest kept).
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    restaurant: data.restaurant,
    ts: data.created_at,
  };
}

export async function listLeads(): Promise<Lead[]> {
  const client = await sb();
  const { data, error } = await client
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(MAX_LEADS);
  if (error) throw new Error(`store: leads read failed — ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    restaurant: r.restaurant,
    ts: r.created_at,
  }));
}
