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
  ManagerMessage,
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
  role: "super" | "manager" | "admin";
  created_at: string;
  expires_at: string | null;
  source: AccountSource | null;
  parent_id?: string | null;
  branch_id?: string | null;
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
    parentId: r.parent_id ?? null,
    branchId: r.branch_id ?? null,
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
    maxTables: typeof data.max_tables === "number" ? data.max_tables : undefined,
    maxBranches: typeof data.max_branches === "number" ? data.max_branches : undefined,
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
      max_tables: next.maxTables ?? null,
      max_branches: next.maxBranches ?? null,
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
          // Stamp the ledger row with the table's branch so branch-scoped revenue
          // analytics need no join. Empty string → null in the RPC.
          branch_id: t.branchId ?? "",
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
  branchId?: string | null,
): Promise<LiveTable | null> {
  // Located by (owner, num) — unique per owner. A branch-admin additionally pins
  // the branch so it can't touch another branch's table that shares a number.
  const eqs: Eq[] = [["owner", owner], ["num", Number(num)]];
  if (branchId) eqs.push(["branch_id", branchId]);
  return casTable(eqs, (t, { taxRate, currency }) => {
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
  branchId?: string | null,
): Promise<LiveTable | null> {
  const eqs: Eq[] = [["owner", owner], ["num", Number(num)]];
  if (branchId) eqs.push(["branch_id", branchId]);
  return casTable(eqs, (t, { currency }) => {
    t.status = status;
    if (status === "open") t.amount = "—";
    else if (t.amount === "—") t.amount = fmt(0, currency);
    return { write: true };
  });
}

export async function deleteTable(
  num: string,
  owner: string,
  branchId?: string | null,
): Promise<boolean> {
  const client = await sb();
  let q = client.from("tables").delete().eq("owner", owner).eq("num", Number(num));
  if (branchId) q = q.eq("branch_id", branchId);
  const { data, error } = await q.select("id");
  if (error) throw new Error(`store: table delete failed — ${error.message}`);
  return (data?.length ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Transactions (ledger) — writes happen atomically inside commit_table_update.
// ---------------------------------------------------------------------------

export async function listTransactions(
  owner: string,
  opts: { branchId?: string | null } = {},
): Promise<Transaction[]> {
  const client = await sb();
  let q = client
    .from("transactions")
    .select("owner, table_num, time, amount, method, created_at")
    .eq("owner", owner)
    .order("created_at", { ascending: false })
    .limit(MAX_TXN_HISTORY);
  if (opts.branchId) q = q.eq("branch_id", opts.branchId);
  const { data, error } = await q;
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

// The super console provisions MANAGER accounts (chain owners). These functions
// operate on role 'manager'. Branch-admins (role 'admin') are managed by their
// owning manager via the listBranchAdmins/createBranchAdmin/... set below.
export async function listAdmins(): Promise<AdminUser[]> {
  const client = await sb();
  const { data, error } = await client
    .from("accounts")
    .select("*")
    .eq("role", "manager")
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
      role: "manager",
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
  // Cascade (tables/transactions/menus/settings/branches + child branch-admins)
  // is enforced by FK ON DELETE CASCADE; the super account can't be deleted.
  const { data, error } = await client
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("role", "manager")
    .select("id");
  if (error) throw new Error(`store: account delete failed — ${error.message}`);
  return (data?.length ?? 0) > 0;
}

// --- Branch-admins (role 'admin', owned by a manager) -----------------------

/** All branch-admins owned by a manager, newest first. */
export async function listBranchAdmins(parentId: string): Promise<AdminUser[]> {
  const client = await sb();
  const { data, error } = await client
    .from("accounts")
    .select("*")
    .eq("role", "admin")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`store: branch-admins read failed — ${error.message}`);
  return (data ?? []).map((r) => rowToUser(r as AccountRow));
}

/** One branch-admin, only if owned by `parentId` (ownership 404 otherwise). */
export async function getBranchAdmin(
  parentId: string,
  id: string,
): Promise<AdminUser | null> {
  const client = await sb();
  const { data, error } = await client
    .from("accounts")
    .select("*")
    .eq("id", id)
    .eq("role", "admin")
    .eq("parent_id", parentId)
    .maybeSingle();
  if (error) throw new Error(`store: branch-admin read failed — ${error.message}`);
  return data ? rowToUser(data as AccountRow) : null;
}

export async function createBranchAdmin(
  parentId: string,
  branchId: string,
  email: string,
  passwordHash: string,
): Promise<AdminUser | null> {
  const norm = email.trim().toLowerCase();
  const client = await sb();
  const { data, error } = await client
    .from("accounts")
    .insert({
      email: norm,
      password_hash: passwordHash,
      role: "admin",
      source: "manual",
      expires_at: null,
      parent_id: parentId,
      branch_id: branchId,
    })
    .select("*")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") return null;
    throw new Error(`store: branch-admin create failed — ${error.message}`);
  }
  return data ? rowToUser(data as AccountRow) : null;
}

/** Edit a branch-admin owned by `parentId`: email, password, and/or its branch. */
export async function updateBranchAdmin(
  parentId: string,
  id: string,
  patch: { email?: string; passwordHash?: string; branchId?: string },
): Promise<AdminUser | null | "duplicate"> {
  const client = await sb();
  const fields: Record<string, unknown> = {};
  if (typeof patch.email === "string") fields.email = patch.email.trim().toLowerCase();
  if (typeof patch.passwordHash === "string") fields.password_hash = patch.passwordHash;
  if (typeof patch.branchId === "string") fields.branch_id = patch.branchId;
  if (Object.keys(fields).length === 0) return getBranchAdmin(parentId, id);
  const { data, error } = await client
    .from("accounts")
    .update(fields)
    .eq("id", id)
    .eq("role", "admin")
    .eq("parent_id", parentId)
    .select("*")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") return "duplicate";
    throw new Error(`store: branch-admin update failed — ${error.message}`);
  }
  return data ? rowToUser(data as AccountRow) : null;
}

export async function deleteBranchAdmin(
  parentId: string,
  id: string,
): Promise<boolean> {
  const client = await sb();
  const { data, error } = await client
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("role", "admin")
    .eq("parent_id", parentId)
    .select("id");
  if (error) throw new Error(`store: branch-admin delete failed — ${error.message}`);
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
    .eq("role", "manager");
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
    .eq("role", "manager")
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

/** Apply a (owner, branch_id) match, treating null branchId as the chain menu. */
function branchEq<Q extends { eq: (c: string, v: string) => Q; is: (c: string, v: null) => Q }>(
  q: Q,
  branchId: string | null | undefined,
): Q {
  return branchId ? q.eq("branch_id", branchId) : q.is("branch_id", null);
}

export async function getMenu(
  owner: string,
  branchId?: string | null,
): Promise<MenuMeta | null> {
  const client = await sb();
  const q = branchEq(
    client.from("menus").select("*").eq("owner", owner),
    branchId,
  );
  // limit(1)+[0] (not maybeSingle) so a stray duplicate row can never make the
  // read THROW — the unique indexes prevent dups, this is belt-and-suspenders.
  const { data, error } = await q.order("uploaded_at", { ascending: false }).limit(1);
  if (error) {
    // Pre-migration schema (no branch_id column): fall back to the owner menu so
    // new code can run before migration 0010 lands.
    if (/branch_id/i.test(error.message)) {
      const { data: d2, error: e2 } = await client
        .from("menus")
        .select("*")
        .eq("owner", owner)
        .limit(1);
      if (e2) throw new Error(`store: menu read failed — ${e2.message}`);
      return d2 && d2[0] ? rowToMenu(d2[0]) : null;
    }
    throw new Error(`store: menu read failed — ${error.message}`);
  }
  return data && data[0] ? rowToMenu(data[0]) : null;
}

export async function getMenuForTable(
  num: string,
  token: string,
): Promise<MenuMeta | null> {
  // Resolve by the unique token (num is now per-owner / ambiguous), then return
  // that table's BRANCH menu, falling back to the chain (null-branch) menu.
  const t = await rawTableBy([["token", token]]);
  if (!t) return null;
  const branchId = (t as TableRow & { branch_id?: string | null }).branch_id ?? null;
  return (await getMenu(t.owner, branchId)) ?? (await getMenu(t.owner, null));
}

export async function setMenu(
  owner: string,
  meta: MenuMeta,
  branchId?: string | null,
): Promise<void> {
  const client = await sb();
  const row = {
    owner,
    branch_id: branchId ?? null,
    filename: meta.filename,
    url: meta.url,
    mime: meta.mime,
    original_name: meta.originalName,
    uploaded_at: meta.uploadedAt,
  };
  // menus is per-(owner, branch). Update-then-insert keyed on (owner, branch_id);
  // the partial UNIQUE indexes (migration 0010) serialize a concurrent first
  // upload — the loser's INSERT hits a 23505 and we fall back to UPDATE, so two
  // racing uploads can never leave duplicate rows (which would break getMenu).
  const tryUpdate = async () => {
    const upd = branchEq(client.from("menus").update(row).eq("owner", owner), branchId);
    return upd.select("owner");
  };
  const { data, error } = await tryUpdate();
  if (error && !/branch_id/i.test(error.message)) {
    throw new Error(`store: menu write failed — ${error.message}`);
  }
  if (data && data.length > 0) return;
  let { error: insErr } = await client.from("menus").insert(row);
  if (insErr && /branch_id/i.test(insErr.message)) {
    // Pre-migration schema: collapse to the legacy owner-keyed upsert.
    const { branch_id: _omit, ...legacy } = row;
    void _omit;
    ({ error: insErr } = await client
      .from("menus")
      .upsert(legacy, { onConflict: "owner" }));
  } else if (insErr && insErr.code === "23505") {
    // Concurrent writer won the insert — the row now exists; update it.
    const { error: updErr } = await tryUpdate();
    if (updErr) throw new Error(`store: menu write failed — ${updErr.message}`);
    return;
  }
  if (insErr) throw new Error(`store: menu write failed — ${insErr.message}`);
}

export async function clearMenu(
  owner: string,
  branchId?: string | null,
): Promise<void> {
  const client = await sb();
  const q = branchEq(client.from("menus").delete().eq("owner", owner), branchId);
  const { error } = await q;
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
  branch_id?: string | null;
  created_at: string;
  updated_at: string;
};

function rowToMenuItem(r: MenuItemRow): MenuItem {
  return {
    id: r.id,
    owner: r.owner,
    branchId: r.branch_id ?? null,
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
  branch_id?: string | null;
  created_at: string;
};

function rowToOrder(r: OrderRow): Order {
  const lines = Array.isArray(r.lines) ? r.lines : [];
  return {
    id: r.id,
    owner: r.owner,
    branchId: r.branch_id ?? null,
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

/** Admin: an owner's non-archived items, in menu order. When `branchId` is given
 *  (branch-admin), restrict to that branch + shared (null-branch) chain items. */
export async function listMenuItems(
  owner: string,
  branchId?: string | null,
): Promise<MenuItem[]> {
  const client = await sb();
  let q = client
    .from("menu_items")
    .select("*")
    .eq("owner", owner)
    .eq("archived", false);
  if (branchId) q = q.or(`branch_id.eq.${branchId},branch_id.is.null`);
  const { data, error } = await q
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(`store: menu items read failed — ${error.message}`);
  return (data ?? []).map((r) => rowToMenuItem(r as MenuItemRow));
}

export async function createMenuItem(
  owner: string,
  input: { name: string; price: number; category?: string; description?: string },
  branchId?: string | null,
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
  const row: Record<string, unknown> = {
    owner,
    name: input.name,
    price: input.price,
    category: input.category ?? "",
    description: input.description ?? "",
    sort_order: sort,
  };
  if (branchId) row.branch_id = branchId;
  let res = await client.from("menu_items").insert(row).select("*").single();
  if (res.error && /branch_id/i.test(res.error.message) && "branch_id" in row) {
    delete row.branch_id;
    res = await client.from("menu_items").insert(row).select("*").single();
  }
  if (res.error) throw new Error(`store: menu item create failed — ${res.error.message}`);
  return rowToMenuItem(res.data as MenuItemRow);
}

export async function updateMenuItem(
  owner: string,
  id: string,
  patch: Partial<Pick<MenuItem, "name" | "price" | "category" | "description" | "available" | "sortOrder">>,
  branchId?: string | null,
): Promise<MenuItem | null> {
  const client = await sb();
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.price !== undefined) row.price = patch.price;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.available !== undefined) row.available = patch.available;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  let q = client.from("menu_items").update(row).eq("id", id).eq("owner", owner);
  // A branch-admin may only edit its own branch's items.
  if (branchId) q = q.eq("branch_id", branchId);
  const { data, error } = await q.select("*").maybeSingle();
  if (error) throw new Error(`store: menu item update failed — ${error.message}`);
  return data ? rowToMenuItem(data as MenuItemRow) : null;
}

export async function deleteMenuItem(
  owner: string,
  id: string,
  branchId?: string | null,
): Promise<boolean> {
  const client = await sb();
  let q = client.from("menu_items").delete().eq("id", id).eq("owner", owner);
  if (branchId) q = q.eq("branch_id", branchId);
  const { data, error } = await q.select("id");
  if (error) throw new Error(`store: menu item delete failed — ${error.message}`);
  return !!data && data.length > 0;
}

/** Customer: available, non-archived items for the table behind `token`. */
export async function getPublicMenuItems(
  token: string,
): Promise<MenuItem[]> {
  const t = await rawTableBy([["token", token]]);
  if (!t) return [];
  const branchId = (t as TableRow & { branch_id?: string | null }).branch_id ?? null;
  const client = await sb();
  let q = client
    .from("menu_items")
    .select("*")
    .eq("owner", t.owner)
    .eq("available", true)
    .eq("archived", false);
  // Diners see this table's branch items + shared (null-branch) chain items.
  if (branchId) q = q.or(`branch_id.eq.${branchId},branch_id.is.null`);
  const { data, error } = await q
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
  const branchId = (t as TableRow & { branch_id?: string | null }).branch_id ?? null;
  const orderRow: Record<string, unknown> = {
    owner: t.owner,
    table_id: t.id,
    table_num: Number(t.num),
    status: "placed",
    lines: withIds,
    total,
  };
  if (branchId) orderRow.branch_id = branchId;
  let res = await client.from("orders").insert(orderRow).select("*").single();
  if (res.error && /branch_id/i.test(res.error.message) && "branch_id" in orderRow) {
    delete orderRow.branch_id;
    res = await client.from("orders").insert(orderRow).select("*").single();
  }
  if (res.error) throw new Error(`store: order create failed — ${res.error.message}`);
  return rowToOrder(res.data as OrderRow);
}

export async function listOrders(
  owner: string,
  opts: { activeOnly?: boolean; branchId?: string | null } = {},
): Promise<Order[]> {
  const client = await sb();
  let q = client
    .from("orders")
    .select("*")
    .eq("owner", owner)
    .order("created_at", { ascending: false })
    .limit(200);
  if (opts.activeOnly) q = q.in("status", ["placed", "preparing"]);
  if (opts.branchId) q = q.eq("branch_id", opts.branchId);
  const { data, error } = await q;
  if (error) throw new Error(`store: orders read failed — ${error.message}`);
  return (data ?? []).map((r) => rowToOrder(r as OrderRow));
}

export async function updateOrderStatus(
  owner: string,
  id: string,
  status: OrderStatus,
  branchId?: string | null,
): Promise<Order | null> {
  const client = await sb();
  let q = client.from("orders").update({ status }).eq("id", id).eq("owner", owner);
  // A branch-admin may only touch its own branch's orders.
  if (branchId) q = q.eq("branch_id", branchId);
  const { data, error } = await q.select("*").maybeSingle();
  if (error) throw new Error(`store: order status update failed — ${error.message}`);
  return data ? rowToOrder(data as OrderRow) : null;
}

// ---------------------------------------------------------------------------
// Contact channel: manager → super messages
// ---------------------------------------------------------------------------

type ManagerMessageRow = {
  id: string;
  manager_id: string;
  subject: string | null;
  body: string | null;
  status: "open" | "resolved";
  created_at: string;
  reply?: string | null;
  replied_at?: string | null;
};

function rowToManagerMessage(r: ManagerMessageRow): ManagerMessage {
  return {
    id: r.id,
    managerId: r.manager_id,
    subject: r.subject ?? "",
    body: r.body ?? "",
    status: r.status === "resolved" ? "resolved" : "open",
    createdAt: r.created_at,
    reply: r.reply ?? null,
    repliedAt: r.replied_at ?? null,
  };
}

export async function createManagerMessage(
  managerId: string,
  subject: string,
  body: string,
): Promise<ManagerMessage> {
  const client = await sb();
  const { data, error } = await client
    .from("manager_messages")
    .insert({ manager_id: managerId, subject, body })
    .select("*")
    .single();
  if (error) throw new Error(`store: message create failed — ${error.message}`);
  return rowToManagerMessage(data as ManagerMessageRow);
}

/** Super: every manager message (newest first), with the sender's email joined. */
export async function listManagerMessages(): Promise<ManagerMessage[]> {
  const client = await sb();
  const { data, error } = await client
    .from("manager_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`store: messages read failed — ${error.message}`);
  const rows = (data ?? []).map((r) => rowToManagerMessage(r as ManagerMessageRow));
  // Attach the manager email for display (best-effort; small N).
  return Promise.all(
    rows.map(async (m) => {
      const u = await getUserById(m.managerId);
      return { ...m, managerEmail: u?.email ?? "" };
    }),
  );
}

/** Manager: its own outbound messages. */
export async function listManagerMessagesFor(
  managerId: string,
): Promise<ManagerMessage[]> {
  const client = await sb();
  const { data, error } = await client
    .from("manager_messages")
    .select("*")
    .eq("manager_id", managerId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`store: messages read failed — ${error.message}`);
  return (data ?? []).map((r) => rowToManagerMessage(r as ManagerMessageRow));
}

export async function setManagerMessageStatus(
  id: string,
  status: "open" | "resolved",
): Promise<boolean> {
  const client = await sb();
  const { data, error } = await client
    .from("manager_messages")
    .update({ status })
    .eq("id", id)
    .select("id");
  if (error) throw new Error(`store: message update failed — ${error.message}`);
  return (data?.length ?? 0) > 0;
}

/** Super stores a reply (marks resolved). Returns the message + the manager's
 *  email so the caller can notify them. Null if no such message. */
export async function replyManagerMessage(
  id: string,
  reply: string,
): Promise<(ManagerMessage & { managerEmail: string }) | null> {
  const client = await sb();
  const full = { reply, replied_at: new Date().toISOString(), status: "resolved" };
  let { data, error } = await client
    .from("manager_messages")
    .update(full)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  // Pre-migration (reply/replied_at absent): degrade like the other write paths —
  // still flip status to resolved; the reply text is emailed regardless (it comes
  // from the argument, not the DB) and persists once migration 0011 lands.
  if (error && /Could not find the '(reply|replied_at)' column/i.test(error.message)) {
    ({ data, error } = await client
      .from("manager_messages")
      .update({ status: "resolved" })
      .eq("id", id)
      .select("*")
      .maybeSingle());
  }
  if (error) throw new Error(`store: message reply failed — ${error.message}`);
  if (!data) return null;
  const msg = { ...rowToManagerMessage(data as ManagerMessageRow), reply, repliedAt: full.replied_at };
  const u = await getUserById(msg.managerId);
  return { ...msg, managerEmail: u?.email ?? "" };
}

/** Set an account's password hash by id (self-service change; any role). */
export async function setAccountPassword(
  id: string,
  passwordHash: string,
): Promise<boolean> {
  const client = await sb();
  const { data, error } = await client
    .from("accounts")
    .update({ password_hash: passwordHash })
    .eq("id", id)
    .select("id");
  if (error) throw new Error(`store: password update failed — ${error.message}`);
  return (data?.length ?? 0) > 0;
}
