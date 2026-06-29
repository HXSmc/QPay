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

import { hashPassword } from "./auth";
import { SUPER_EMAIL, SUPER_PASSWORD } from "./constants";
import { fmt, type Currency } from "./data";
import { decryptPosConfig, encryptPosConfig } from "./pos-secrets";
import { sb } from "./supabase";
import {
  applyPayment,
  buildOrderLines,
  clampHold,
  coerceSettings,
  type LeadInput,
  mergeSettings,
  newToken,
  nextStatusForItems,
  normalizeLead,
  orderAmount,
  pruneReservations,
  zeros,
} from "./store-core";
import { sanitizePosConfig } from "./pos";
import type {
  AccountSource,
  AdminUser,
  Branch,
  Lead,
  LiveTable,
  MenuItem,
  MenuMeta,
  Order,
  OrderItem,
  OrderLine,
  OrderStatus,
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
  id: string;
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
  branch_id?: string | null;
};

function rowToTable(r: TableRow): LiveTable {
  const items = Array.isArray(r.items) ? r.items : [];
  const pq = Array.isArray(r.paid_qty) ? r.paid_qty : [];
  return {
    num: String(r.num),
    owner: r.owner,
    branchId: r.branch_id ?? null,
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
  // select("*") so a not-yet-migrated `currency` column simply comes back
  // undefined (coerceSettings falls back to USD) instead of erroring the read.
  const { data, error } = await client
    .from("settings")
    .select("*")
    .eq("owner", owner)
    .maybeSingle();
  if (error) throw new Error(`store: settings read failed — ${error.message}`);
  if (!data) return coerceSettings(null);
  const posSystem = typeof data.pos_system === "string" ? data.pos_system : undefined;
  // Decrypt secret POS fields (stored as ciphertext) before coercing.
  const posConfig =
    data.pos_config && typeof data.pos_config === "object"
      ? await decryptPosConfig(posSystem, data.pos_config)
      : undefined;
  return coerceSettings({
    name: data.name,
    taxRate: Number(data.tax_rate),
    currency: data.currency,
    autoReceipts: data.auto_receipts,
    tipPrompts: data.tip_prompts,
    // New columns: absent on a not-yet-migrated DB → coerceSettings defaults.
    tables: typeof data.num_tables === "number" ? data.num_tables : undefined,
    branches: typeof data.num_branches === "number" ? data.num_branches : undefined,
    posSystem,
    posConfig,
  });
}

/**
 * Insert/upsert that survives a not-yet-migrated DB: if PostgREST rejects an
 * unknown column (PGRST204 "Could not find the 'X' column …"), drop that column
 * and retry, so the app can deploy before its migration lands. Returns the
 * inserted row (when `select` requested) or null.
 */
async function writeWithOptionalCols(
  table: string,
  row: Record<string, unknown>,
  opts: { onConflict?: string; select?: boolean } = {},
): Promise<Record<string, unknown> | null> {
  const client = await sb();
  const payload = { ...row };
  for (let i = 0; i < 12; i++) {
    const base = opts.onConflict
      ? client.from(table).upsert(payload, { onConflict: opts.onConflict })
      : client.from(table).insert(payload);
    const { data, error } = opts.select
      ? await base.select("*").single()
      : await base;
    if (!error) return (data as Record<string, unknown> | null) ?? null;
    const miss = /Could not find the '([^']+)' column/i.exec(error.message);
    if (miss && miss[1] in payload) {
      delete payload[miss[1]];
      continue;
    }
    throw new Error(`store: ${table} write failed — ${error.message}`);
  }
  throw new Error(`store: ${table} write failed — too many unknown columns`);
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
  // Encrypt secret POS fields before persisting (non-secret fields stay plaintext).
  const encConfig = await encryptPosConfig(next.posSystem, next.posConfig);
  // writeWithOptionalCols drops any column the DB doesn't have yet (currency /
  // pos_system / num_tables / num_branches / pos_config on a pre-migration DB)
  // and retries, so saving settings never breaks before the migration lands.
  await writeWithOptionalCols(
    "settings",
    {
      owner,
      name: next.name,
      tax_rate: next.taxRate,
      auto_receipts: next.autoReceipts,
      tip_prompts: next.tipPrompts,
      currency: next.currency,
      num_tables: next.tables ?? null,
      num_branches: next.branches ?? null,
      pos_system: next.posSystem ?? null,
      pos_config: encConfig,
    },
    { onConflict: "owner" },
  );
  return next;
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export async function listTables(
  owner: string,
  opts: { branchId?: string; includeUnassigned?: boolean } = {},
): Promise<LiveTable[]> {
  const client = await sb();
  let q = client.from("tables").select("*").eq("owner", owner);
  if (opts.branchId) {
    q = opts.includeUnassigned
      ? q.or(`branch_id.eq.${opts.branchId},branch_id.is.null`)
      : q.eq("branch_id", opts.branchId);
  }
  const { data, error } = await q.order("num", { ascending: true });
  if (error) throw new Error(`store: tables read failed — ${error.message}`);
  return (data ?? []).map((r) => rowToTable(r as TableRow));
}

type Eq = [string, string | number];

/** Internal: fetch a single raw row (incl. id + version) by equality filters. */
async function rawTableBy(eqs: Eq[]): Promise<TableRow | null> {
  const client = await sb();
  let q = client.from("tables").select("*");
  for (const [c, v] of eqs) q = q.eq(c, v);
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(`store: table read failed — ${error.message}`);
  return (data as TableRow) ?? null;
}

/** Resolve a table by its unique capability token (the customer path). */
export async function getTableByToken(
  token: string,
): Promise<LiveTable | null> {
  const r = await rawTableBy([["token", token]]);
  return r ? rowToTable(r) : null;
}

/**
 * Resolve a table by its (now per-owner, non-unique) display number. Returns the
 * first match — admin/internal callers should pass owner too via the dedicated
 * functions; customer callers use getTableByToken.
 */
export async function getTable(num: string): Promise<LiveTable | null> {
  const client = await sb();
  const { data, error } = await client
    .from("tables")
    .select("*")
    .eq("num", Number(num))
    .limit(1);
  if (error) throw new Error(`store: table read failed — ${error.message}`);
  return data && data[0] ? rowToTable(data[0] as TableRow) : null;
}

/**
 * Compare-and-swap a table update. The row is located by `eqs` (token for the
 * customer path, owner+num for the admin path) and the conditional UPDATE keys on
 * the surrogate `id` + `version`. Retries on a lost CAS. Returns the updated
 * table, or null if not found / no-op.
 */
async function casTable(
  eqs: Eq[],
  apply: (
    t: LiveTable,
    ctx: { taxRate: number; currency: Currency },
  ) => Promise<{ write: boolean; txn?: Transaction | null }> | {
    write: boolean;
    txn?: Transaction | null;
  },
): Promise<LiveTable | null> {
  const client = await sb();
  for (let attempt = 0; ; attempt++) {
    const row = await rawTableBy(eqs);
    if (!row) return null;
    const id = row.id;
    const version = Number(row.version) || 0;
    const t = rowToTable(row);
    const set = await settingsRow(t.owner);
    const res = await apply(t, { taxRate: set.taxRate, currency: set.currency });
    if (!res.write) return t;

    // Atomic CAS update + (optional) ledger insert in ONE DB transaction, so a
    // committed payment can never be missing its transaction record.
    const txnPayload = res.txn
      ? {
          owner: res.txn.owner,
          table_num: Number(res.txn.table),
          time: res.txn.time,
          amount: res.txn.amount,
          method: res.txn.method,
        }
      : null;
    const { data, error } = await client.rpc("commit_table_update", {
      p_id: id,
      p_expected_version: version,
      p_status: t.status,
      p_amount: t.amount,
      p_items: t.items,
      p_paid: t.paid,
      p_paid_qty: t.paidQty,
      p_reservations: t.reservations,
      p_txn: txnPayload,
    });
    if (error) throw new Error(`store: table CAS failed — ${error.message}`);
    if (data === true) return t; // committed (txn, if any, persisted atomically)
    // Lost the CAS — another writer advanced the row. Log for observability and
    // retry (a few concurrent payers on the same table is normal; exhausting the
    // retries is not, and should be visible).
    if (attempt >= MAX_CAS_RETRIES) {
      console.error(
        `store: table CAS exhausted ${MAX_CAS_RETRIES} retries for table id=${id} (concurrent write storm)`,
      );
      throw new Error("store: table write conflict (max retries exceeded)");
    }
    console.warn(
      `store: table CAS lost (attempt ${attempt + 1}/${MAX_CAS_RETRIES}) for table id=${id}, retrying`,
    );
    await sleep(15 * (attempt + 1));
  }
}

export async function createTable(
  owner: string,
  branchId?: string | null,
): Promise<LiveTable> {
  const client = await sb();
  // Per-owner allocation that fills gaps: the smallest free number for this
  // owner (admin A: 1,2 · admin B: 1). A deleted number is reused (next_table_num
  // derives from live rows). Reuse is safe — public lookups key on the unique
  // token, so a stale QR for a deleted table 404s rather than hitting a reused
  // number. The allocate-then-insert isn't atomic, so retry on a uniqueness race.
  for (let attempt = 0; ; attempt++) {
    const { data: numData, error: numErr } = await client.rpc("next_table_num", {
      p_owner: owner,
    });
    if (numErr) throw new Error(`store: num alloc failed — ${numErr.message}`);
    const num = Number(numData);
    const token = newToken();
    const table: LiveTable = {
      num: String(num),
      owner,
      branchId: branchId ?? null,
      token,
      status: "open",
      amount: "—",
      items: [],
      paid: 0,
      paidQty: [],
      reservations: [],
    };
    const insertRow: Record<string, unknown> = {
      num,
      owner,
      token,
      status: "open",
      amount: "—",
      items: [],
      paid: 0,
      paid_qty: [],
      reservations: [],
      version: 0,
    };
    if (branchId) insertRow.branch_id = branchId;
    let { error } = await client.from("tables").insert(insertRow);
    // Pre-migration safety: retry without branch_id if the column is absent.
    if (error && /branch_id/i.test(error.message) && "branch_id" in insertRow) {
      delete insertRow.branch_id;
      ({ error } = await client.from("tables").insert(insertRow));
    }
    if (!error) return table;
    // Another concurrent create grabbed the same free num → recompute + retry.
    if (error.code === "23505" && attempt < MAX_CAS_RETRIES) {
      await sleep(15 * (attempt + 1));
      continue;
    }
    throw new Error(`store: table create failed — ${error.message}`);
  }
}

export async function setTableItems(
  num: string,
  items: OrderItem[],
  owner: string,
): Promise<LiveTable | null> {
  // Located by (owner, num) — unique per owner.
  return casTable([["owner", owner], ["num", Number(num)]], (t, { taxRate, currency }) => {
    t.items = items;
    t.amount = orderAmount(items, taxRate, currency);
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
  // Resolve by the unique token — the num in the URL is now ambiguous.
  return casTable([["token", token]], (t) => {
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
  // Resolve by the unique token (capability) — a match IS the authorization.
  return casTable([["token", opts.token]], (t, { taxRate, currency }) => {
    if (t.items.length === 0) return { write: false };
    const { txn } = applyPayment(t, amount, opts, taxRate, currency);
    return { write: true, txn };
  });
}

export async function setTableStatus(
  num: string,
  status: TableStatus,
  owner: string,
): Promise<LiveTable | null> {
  return casTable([["owner", owner], ["num", Number(num)]], (t, { currency }) => {
    t.status = status;
    if (status === "open") t.amount = "—";
    else if (t.amount === "—") t.amount = fmt(0, currency);
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
    .eq("owner", owner)
    .eq("num", Number(num))
    .select("id");
  if (error) throw new Error(`store: table delete failed — ${error.message}`);
  return (data?.length ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Transactions (ledger) — writes happen atomically inside commit_table_update.
// ---------------------------------------------------------------------------

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

/**
 * Extend an admin's expiry by `days` from max(now, current expiry) — done in a
 * single atomic UPDATE (renew_admin RPC) so two concurrent renewals can't lose
 * each other's extension.
 */
export async function renewAdmin(
  id: string,
  days: number,
): Promise<AdminUser | null> {
  const client = await sb();
  const { data, error } = await client.rpc("renew_admin", {
    p_id: id,
    p_days: days,
  });
  if (error) throw new Error(`store: renew failed — ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  return row ? rowToUser(row as AccountRow) : null;
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
  // Atomic increment under the ON CONFLICT row lock (record_login_failure RPC),
  // so concurrent failed logins can't undercount and slip past the lockout.
  const client = await sb();
  const { error } = await client.rpc("record_login_failure", {
    p_key: key,
    p_now: Date.now(),
    p_window_ms: LOGIN_WINDOW_MS,
    p_lock_ms: LOGIN_LOCK_MS,
    p_max: LOGIN_MAX_FAILS,
  });
  if (error) throw new Error(`store: lock write failed — ${error.message}`);
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
  // Resolve by the unique token (num is now per-owner / ambiguous).
  const t = await rawTableBy([["token", token]]);
  if (!t) return null;
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
  token: string,
): Promise<{ name: string; taxRate: number; currency: Currency } | null> {
  // Resolve by the unique token (the customer scanned a specific table).
  const t = await rawTableBy([["token", token]]);
  if (!t) return null;
  const set = await settingsRow(t.owner);
  const user = await getUserById(t.owner);
  const fallback = user ? user.email.split("@")[0] : "Restaurant";
  return { name: set.name || fallback, taxRate: set.taxRate, currency: set.currency };
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

/** Domain lead → snake_case row (extra cols dropped if unmigrated). */
function leadRow(input: LeadInput): Record<string, unknown> {
  const n = normalizeLead(input);
  return {
    name: n.name,
    email: n.email,
    restaurant: n.restaurant,
    kind: n.kind,
    phone: n.phone || null,
    num_tables: n.tables || null,
    num_branches: n.branches || null,
    pos_system: n.posSystem || null,
    preferred_dates: n.preferredDates || null,
    message: n.message || null,
  };
}

/** Lead row → domain Lead (tolerant of missing columns). */
function rowToLead(r: Record<string, unknown>): Lead {
  return {
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    email: String(r.email ?? ""),
    restaurant: String(r.restaurant ?? ""),
    kind: r.kind === "sales" ? "sales" : "demo",
    phone: typeof r.phone === "string" ? r.phone : undefined,
    tables: typeof r.num_tables === "number" ? r.num_tables : undefined,
    branches: typeof r.num_branches === "number" ? r.num_branches : undefined,
    posSystem: typeof r.pos_system === "string" ? r.pos_system : undefined,
    preferredDates: typeof r.preferred_dates === "string" ? r.preferred_dates : undefined,
    message: typeof r.message === "string" ? r.message : undefined,
    ts: String(r.created_at ?? ""),
  };
}

export async function addLead(input: LeadInput): Promise<Lead> {
  const lead = leadRow(input);
  // Extra profiling columns drop out gracefully on a pre-migration DB.
  const data = (await writeWithOptionalCols("leads", lead, { select: true })) ?? {};
  return rowToLead(data);
}

export async function listLeads(): Promise<Lead[]> {
  const client = await sb();
  const { data, error } = await client
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(MAX_LEADS);
  if (error) throw new Error(`store: leads read failed — ${error.message}`);
  return (data ?? []).map(rowToLead);
}

// ---------------------------------------------------------------------------
// Branches (multi-location)
// ---------------------------------------------------------------------------

type BranchRow = {
  id: string;
  owner: string;
  name: string | null;
  external_id: string | null;
  pos_system: string | null;
  pos_config: Record<string, string> | null;
  created_at: string;
};

async function rowToBranch(r: BranchRow): Promise<Branch> {
  const posSystem = r.pos_system ?? "";
  const posConfig =
    r.pos_config && typeof r.pos_config === "object"
      ? await decryptPosConfig(posSystem, r.pos_config)
      : {};
  return {
    id: r.id,
    owner: r.owner,
    name: r.name || "Main",
    externalId: r.external_id ?? "",
    posSystem,
    posConfig,
    createdAt: r.created_at,
  };
}

/** A synthetic default branch used when the branches table doesn't exist yet
 *  (pre-migration) so single-branch accounts keep working. */
function syntheticDefault(owner: string): Branch {
  return { id: "default", owner, name: "Main", externalId: "", posSystem: "", posConfig: {}, createdAt: "" };
}

async function insertBranch(owner: string, name: string): Promise<BranchRow> {
  const client = await sb();
  const { data, error } = await client
    .from("branches")
    .insert({ owner, name, external_id: "", pos_config: {} })
    .select("*")
    .single();
  if (error) throw new Error(`store: branch create failed — ${error.message}`);
  return data as BranchRow;
}

export async function listBranches(owner: string): Promise<Branch[]> {
  const client = await sb();
  const { data, error } = await client
    .from("branches")
    .select("*")
    .eq("owner", owner)
    .order("created_at", { ascending: true });
  if (error) {
    // Table not migrated yet → behave as a single default branch.
    if (/relation .*branches.* does not exist|find the table|schema cache/i.test(error.message)) {
      return [syntheticDefault(owner)];
    }
    throw new Error(`store: branches read failed — ${error.message}`);
  }
  let rows = (data ?? []) as BranchRow[];
  if (rows.length === 0) rows = [await insertBranch(owner, "Main")];
  return Promise.all(rows.map(rowToBranch));
}

export async function createBranch(
  owner: string,
  name: string,
  ensureDefault = true,
): Promise<Branch> {
  // Ensure a default exists first so the new one is never the only row (skipped
  // by reconcile, which has already ensured it — avoids re-listing per create).
  if (ensureDefault) await listBranches(owner);
  return rowToBranch(await insertBranch(owner, name.trim().slice(0, 80) || "Branch"));
}

export async function updateBranch(
  owner: string,
  id: string,
  patch: { name?: string; externalId?: string; posSystem?: string; posConfig?: Record<string, string> },
): Promise<Branch | null> {
  const client = await sb();
  const { data: curRow } = await client
    .from("branches")
    .select("*")
    .eq("owner", owner)
    .eq("id", id)
    .maybeSingle();
  if (!curRow) return null;
  const posSystem =
    typeof patch.posSystem === "string" ? patch.posSystem : (curRow.pos_system ?? "");
  const fields: Record<string, unknown> = {};
  if (typeof patch.name === "string") fields.name = patch.name.trim().slice(0, 80) || "Branch";
  if (typeof patch.externalId === "string") fields.external_id = patch.externalId.trim().slice(0, 120);
  if (typeof patch.posSystem === "string") fields.pos_system = posSystem;
  if (patch.posConfig) {
    const clean = sanitizePosConfig(posSystem, patch.posConfig);
    fields.pos_config = await encryptPosConfig(posSystem, clean);
  }
  if (Object.keys(fields).length === 0) return rowToBranch(curRow as BranchRow);
  const { data, error } = await client
    .from("branches")
    .update(fields)
    .eq("owner", owner)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`store: branch update failed — ${error.message}`);
  return data ? rowToBranch(data as BranchRow) : null;
}

export async function deleteBranch(
  owner: string,
  id: string,
): Promise<{ ok: boolean; reason?: "last" | "not-found" }> {
  const branches = await listBranches(owner);
  if (branches.length <= 1) return { ok: false, reason: "last" };
  const fallback = branches.find((b) => b.id !== id);
  if (!fallback) return { ok: false, reason: "last" };
  const client = await sb();
  // Move this branch's tables to the fallback branch so none are orphaned.
  await client.from("tables").update({ branch_id: fallback.id }).eq("owner", owner).eq("branch_id", id);
  const { data, error } = await client
    .from("branches")
    .delete()
    .eq("owner", owner)
    .eq("id", id)
    .select("id");
  if (error) throw new Error(`store: branch delete failed — ${error.message}`);
  return { ok: (data?.length ?? 0) > 0, reason: (data?.length ?? 0) > 0 ? undefined : "not-found" };
}

// ---------------------------------------------------------------------------
// Menu items (structured, orderable) + customer orders — optional feature
// ---------------------------------------------------------------------------

type MenuItemRow = {
  id: string;
  owner: string;
  name: string;
  price: number | string;
  category: string | null;
  description: string | null;
  available: boolean;
  sort_order: number | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

function rowToMenuItem(r: MenuItemRow): MenuItem {
  return {
    id: r.id,
    owner: r.owner,
    name: r.name,
    price: Number(r.price) || 0,
    category: r.category ?? "",
    description: r.description ?? "",
    available: !!r.available,
    sortOrder: Number(r.sort_order) || 0,
    archived: !!r.archived,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

type OrderRow = {
  id: string;
  owner: string;
  table_id: string;
  table_num: number | string;
  status: OrderStatus;
  lines: OrderLine[] | null;
  total: number | string | null;
  created_at: string;
};

function rowToOrder(r: OrderRow): Order {
  const lines = Array.isArray(r.lines) ? r.lines : [];
  return {
    id: r.id,
    owner: r.owner,
    tableId: r.table_id,
    tableNum: String(r.table_num),
    status: r.status,
    lines: lines.map((l, i) => ({
      id: l.id ?? String(i),
      menuItemId: l.menuItemId ?? null,
      name: l.name,
      price: Number(l.price) || 0,
      qty: Number(l.qty) || 0,
      comment: l.comment ?? "",
    })),
    total: Number(r.total) || 0,
    createdAt: r.created_at,
  };
}

/** Admin: all of an owner's non-archived items, in menu order. */
export async function listMenuItems(owner: string): Promise<MenuItem[]> {
  const client = await sb();
  const { data, error } = await client
    .from("menu_items")
    .select("*")
    .eq("owner", owner)
    .eq("archived", false)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(`store: menu items read failed — ${error.message}`);
  return (data ?? []).map((r) => rowToMenuItem(r as MenuItemRow));
}

export async function createMenuItem(
  owner: string,
  input: { name: string; price: number; category?: string; description?: string },
): Promise<MenuItem> {
  const client = await sb();
  // Append after the current max sort_order.
  const { data: maxRow } = await client
    .from("menu_items")
    .select("sort_order")
    .eq("owner", owner)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort = (Number(maxRow?.sort_order) || 0) + 1;
  const { data, error } = await client
    .from("menu_items")
    .insert({
      owner,
      name: input.name,
      price: input.price,
      category: input.category ?? "",
      description: input.description ?? "",
      sort_order: sort,
    })
    .select("*")
    .single();
  if (error) throw new Error(`store: menu item create failed — ${error.message}`);
  return rowToMenuItem(data as MenuItemRow);
}

export async function updateMenuItem(
  owner: string,
  id: string,
  patch: Partial<Pick<MenuItem, "name" | "price" | "category" | "description" | "available" | "sortOrder">>,
): Promise<MenuItem | null> {
  const client = await sb();
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.price !== undefined) row.price = patch.price;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.available !== undefined) row.available = patch.available;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  const { data, error } = await client
    .from("menu_items")
    .update(row)
    .eq("id", id)
    .eq("owner", owner)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`store: menu item update failed — ${error.message}`);
  return data ? rowToMenuItem(data as MenuItemRow) : null;
}

export async function deleteMenuItem(owner: string, id: string): Promise<boolean> {
  const client = await sb();
  const { data, error } = await client
    .from("menu_items")
    .delete()
    .eq("id", id)
    .eq("owner", owner)
    .select("id");
  if (error) throw new Error(`store: menu item delete failed — ${error.message}`);
  return !!data && data.length > 0;
}

/** Customer: available, non-archived items for the table behind `token`. */
export async function getPublicMenuItems(
  token: string,
): Promise<MenuItem[]> {
  const t = await rawTableBy([["token", token]]);
  if (!t) return [];
  const client = await sb();
  const { data, error } = await client
    .from("menu_items")
    .select("*")
    .eq("owner", t.owner)
    .eq("available", true)
    .eq("archived", false)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(`store: public items read failed — ${error.message}`);
  return (data ?? []).map((r) => rowToMenuItem(r as MenuItemRow));
}

/** Customer: place an order against the table behind `token`. Prices snapshotted
 *  server-side from live items; the client can only pick id/qty/comment. */
export async function placeOrder(
  token: string,
  requested: { menuItemId?: string; qty?: number; comment?: string }[],
): Promise<Order | null> {
  const t = await rawTableBy([["token", token]]);
  if (!t) return null;
  const available = await getPublicMenuItems(token);
  const { lines, total } = buildOrderLines(available, requested);
  if (lines.length === 0) return null;
  const client = await sb();
  const withIds = lines.map((l, i) => ({ id: `${i}`, ...l }));
  const { data, error } = await client
    .from("orders")
    .insert({
      owner: t.owner,
      table_id: t.id,
      table_num: Number(t.num),
      status: "placed",
      lines: withIds,
      total,
    })
    .select("*")
    .single();
  if (error) throw new Error(`store: order create failed — ${error.message}`);
  return rowToOrder(data as OrderRow);
}

export async function listOrders(
  owner: string,
  opts: { activeOnly?: boolean } = {},
): Promise<Order[]> {
  const client = await sb();
  let q = client
    .from("orders")
    .select("*")
    .eq("owner", owner)
    .order("created_at", { ascending: false })
    .limit(200);
  if (opts.activeOnly) q = q.in("status", ["placed", "preparing"]);
  const { data, error } = await q;
  if (error) throw new Error(`store: orders read failed — ${error.message}`);
  return (data ?? []).map((r) => rowToOrder(r as OrderRow));
}

export async function updateOrderStatus(
  owner: string,
  id: string,
  status: OrderStatus,
): Promise<Order | null> {
  const client = await sb();
  const { data, error } = await client
    .from("orders")
    .update({ status })
    .eq("id", id)
    .eq("owner", owner)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`store: order status update failed — ${error.message}`);
  return data ? rowToOrder(data as OrderRow) : null;
}
