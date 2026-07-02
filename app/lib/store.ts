// Store facade. All API routes import from here; the public function signatures
// are the stable boundary. Internally this dispatches to one of two backends:
//
//   • Relational Supabase (app/lib/store-sb.ts) when SUPABASE_URL is set — the
//     production path. Per-row tables, per-row CAS for table mutations.
//   • A disk/KV jsonb blob (below) for local dev / offline builds.
//
// Domain math (payment locking, settings merge) lives in store-core.ts so the
// two backends can never drift.

import { promises as fs } from "fs";
import path from "path";
import { constantTimeEqual, getSession, hashPassword, passwordFingerprint } from "./auth";
import { useSupabase } from "./supabase";
import * as rel from "./store-sb";
import { fmt, type Currency } from "./data";
import { posSecretKeys, sanitizePosConfig } from "./pos";
import { decryptPosConfig, encryptPosConfig } from "./pos-secrets";
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
  OrderStatus,
  RestaurantSettings,
  Role,
  Store,
  TableStatus,
  Transaction,
} from "./types";

const MAX_TXN_HISTORY = 1000;
const MAX_LEADS = 1000;
// Re-export the shared lifecycle constants so existing `@/app/lib/store` imports
// keep working (single source of truth lives in ./constants).
export { TRIAL_DAYS, RENEW_DAYS } from "./constants";
import { RENEW_DAYS, SUPER_EMAIL, SUPER_PASSWORD, TRIAL_DAYS } from "./constants";
import { SITE } from "./site";

// ---------------------------------------------------------------------------
// Public (non-secret) account view
// ---------------------------------------------------------------------------

export interface PublicUser {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  /** ISO expiry, or null for never-expiring (super + manual admins). */
  expiresAt: string | null;
  source: AccountSource;
  /** Derived: false once an expiry has passed. */
  active: boolean;
  /** Branch a branch-admin manages (role 'admin'); null for super/manager. */
  branchId?: string | null;
  /** Owning manager id for a branch-admin; null for super/manager. */
  parentId?: string | null;
  /** Per-account config the super console displays/edits (attached by listAdmins). */
  config?: {
    name: string;
    tables: number;
    branches: number;
    maxTables: number;
    maxBranches: number;
    posSystem: string;
  };
}

function publicUser(u: AdminUser): PublicUser {
  const expiresAt = u.expiresAt ?? null;
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    expiresAt,
    source: u.source ?? "manual",
    active: !expiresAt || new Date(expiresAt).getTime() > Date.now(),
    branchId: u.branchId ?? null,
    parentId: u.parentId ?? null,
  };
}

// ---------------------------------------------------------------------------
// Effective data scope for a request's account.
// ---------------------------------------------------------------------------

/**
 * Resolve the (ownerId, branchId) a user's data queries run under.
 *   • super   → not a data owner (handled by the super console separately).
 *   • manager → owns its own data across the whole chain (branchId = null).
 *   • admin   → a branch operator: data lives under its parent MANAGER, scoped to
 *               its single branch. ownerId = parentId, branchId = its branch.
 */
export interface Scope {
  ownerId: string;
  branchId: string | null;
  role: Role;
  /** The account's own id (distinct from ownerId for branch-admins). */
  selfId: string;
}

export function scopeFor(u: AdminUser): Scope {
  if (u.role === "admin") {
    return {
      ownerId: u.parentId ?? u.id,
      branchId: u.branchId ?? null,
      role: "admin",
      selfId: u.id,
    };
  }
  return { ownerId: u.id, branchId: null, role: u.role, selfId: u.id };
}

/** True once an account's expiry has passed (trial lapsed). */
function isExpired(u: AdminUser): boolean {
  return !!u.expiresAt && new Date(u.expiresAt).getTime() <= Date.now();
}

/** Cryptographically-random, email-friendly password (~16 chars, base64url). */
function genPassword(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(12));
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ===========================================================================
// DISK / KV BLOB BACKEND (local dev fallback)
// ===========================================================================

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");
export const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function seed(): Store {
  return {
    tables: [],
    branches: [],
    transactions: [],
    leads: [],
    managerMessages: [],
    menus: {},
    menuItems: [],
    orders: [],
    settings: {},
    users: [],
    loginAttempts: {},
    seq: 0,
    version: 0,
  };
}

function settingsFor(s: Store, owner: string): RestaurantSettings {
  return coerceSettings(s.settings[owner]);
}

/**
 * Like settingsFor but DECRYPTS the stored POS secrets before coercing. The raw
 * stored posConfig holds ciphertext; coerceSettings/sanitizePosConfig clamps
 * field values to 400 chars, which would corrupt a long ciphertext token if
 * applied first — so decrypt the raw value, THEN coerce. (Mirrors the relational
 * backend, which also decrypts before coercing.)
 */
async function diskSettings(s: Store, owner: string): Promise<RestaurantSettings> {
  const raw = s.settings[owner];
  if (!raw) return coerceSettings(null);
  const sys = typeof raw.posSystem === "string" ? raw.posSystem : "";
  const cfg = raw.posConfig ? await decryptPosConfig(sys, raw.posConfig) : {};
  return coerceSettings({ ...raw, posConfig: cfg });
}

function normalize(s: Store): Store {
  return {
    tables: (s.tables ?? [])
      .filter((t) => typeof t.owner === "string" && t.owner !== "")
      .map((t) => {
        const items = Array.isArray(t.items) ? t.items : [];
        const pq = Array.isArray(t.paidQty) ? t.paidQty : [];
        return {
          ...t,
          owner: t.owner as string,
          token: typeof t.token === "string" && t.token ? t.token : newToken(),
          items,
          paid: typeof t.paid === "number" ? t.paid : 0,
          paidQty: items.map((_, i) => (typeof pq[i] === "number" ? pq[i] : 0)),
          reservations: Array.isArray(t.reservations) ? t.reservations : [],
        };
      }),
    transactions: (s.transactions ?? []).filter(
      (tx) => typeof tx.owner === "string" && tx.owner !== "",
    ),
    branches: Array.isArray(s.branches) ? s.branches : [],
    leads: Array.isArray(s.leads) ? s.leads : [],
    managerMessages: Array.isArray(s.managerMessages) ? s.managerMessages : [],
    menus:
      s.menus && typeof s.menus === "object" && !Array.isArray(s.menus)
        ? s.menus
        : {},
    menuItems: Array.isArray(s.menuItems) ? s.menuItems : [],
    orders: Array.isArray(s.orders) ? s.orders : [],
    settings:
      s.settings && typeof s.settings === "object" && !Array.isArray(s.settings)
        ? s.settings
        : {},
    users: Array.isArray(s.users) ? s.users : [],
    loginAttempts:
      s.loginAttempts && typeof s.loginAttempts === "object"
        ? s.loginAttempts
        : {},
    seq: Math.max(
      typeof s.seq === "number" ? s.seq : 0,
      ...(s.tables ?? []).map((t) => Number(t.num) || 0),
      0,
    ),
    version: typeof s.version === "number" ? s.version : 0,
  };
}

async function ensureSuperadminBlob(s: Store): Promise<boolean> {
  if (s.users.some((u) => u.role === "super")) return false;
  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.SUPERADMIN_EMAIL || !process.env.SUPERADMIN_PASSWORD)
  ) {
    throw new Error(
      "SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set in production to seed the super account",
    );
  }
  s.users.push({
    id: globalThis.crypto.randomUUID(),
    email: SUPER_EMAIL,
    passwordHash: await hashPassword(SUPER_PASSWORD),
    role: "super",
    createdAt: new Date().toISOString(),
    source: "manual",
    expiresAt: null,
  });
  return true;
}

async function readStoreBlob(): Promise<Store> {
  // The disk blob is a LOCAL-DEV fallback only. In production it would be an
  // ephemeral, per-instance store that silently loses data — so if a prod request
  // ever reaches this path (SUPABASE_URL unset/misconfigured) fail loudly instead
  // of quietly running on disposable storage. Only fires at runtime on the disk
  // path; the relational backend never calls this, and the build never reads it.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "store: refusing to use the ephemeral disk backend in production — set SUPABASE_URL (+ SUPABASE_SERVICE_ROLE_KEY)",
    );
  }
  let raw: Store;
  let text: string | null = null;
  try {
    text = await fs.readFile(STORE_FILE, "utf8");
  } catch {
    text = null; // no store file yet (first run) — seed silently
  }
  if (text === null) {
    raw = seed();
  } else {
    try {
      raw = JSON.parse(text) as Store;
    } catch (e) {
      // Corrupt store file is NOT normal — surface it instead of silently
      // re-seeding (which would look like "data vanished").
      console.warn(
        `store: ${STORE_FILE} is corrupt JSON — re-seeding. Cause:`,
        e instanceof Error ? e.message : e,
      );
      raw = seed();
    }
  }
  const s = normalize(raw);
  if (await ensureSuperadminBlob(s)) await writeStoreBlob(s);
  return s;
}

async function writeStoreBlob(s: Store): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(s, null, 2), "utf8");
}

// In-process mutex (dev backend is single-instance, so this is sufficient).
let lock: Promise<unknown> = Promise.resolve();
async function mutateBlob<T>(
  apply: (s: Store) => { result: T; write: boolean },
): Promise<T> {
  const run = lock.then(async () => {
    const s = await readStoreBlob();
    const { result, write } = apply(s);
    if (write) {
      s.version = (s.version ?? 0) + 1;
      await writeStoreBlob(s);
    }
    return result;
  });
  lock = run.then(
    () => {},
    () => {},
  );
  return run;
}

// ===========================================================================
// TABLES
// ===========================================================================

export async function listTables(
  owner: string,
  opts: { branchId?: string; includeUnassigned?: boolean } = {},
): Promise<LiveTable[]> {
  if (useSupabase) return rel.listTables(owner, opts);
  const all = (await readStoreBlob()).tables.filter((t) => t.owner === owner);
  if (!opts.branchId) return all;
  return all.filter(
    (t) =>
      t.branchId === opts.branchId ||
      (opts.includeUnassigned && (t.branchId == null || t.branchId === "")),
  );
}

export async function createTable(
  owner: string,
  branchId?: string | null,
): Promise<LiveTable> {
  if (useSupabase) return rel.createTable(owner, branchId);
  return mutateBlob((s) => {
    // Per-owner numbering that fills gaps: smallest free positive integer for
    // this owner, so a deleted number is reused (delete table 2 → next is 2).
    const used = new Set(
      s.tables.filter((t) => t.owner === owner).map((t) => Number(t.num)),
    );
    let num = 1;
    while (used.has(num)) num++;
    const table: LiveTable = {
      num: String(num),
      owner,
      branchId: branchId ?? null,
      token: newToken(),
      status: "open",
      amount: "—",
      items: [],
      paid: 0,
      paidQty: [],
      reservations: [],
    };
    s.tables.push(table);
    return { result: table, write: true };
  });
}

export async function getTable(num: string): Promise<LiveTable | null> {
  if (useSupabase) return rel.getTable(num);
  return (await readStoreBlob()).tables.find((x) => x.num === num) ?? null;
}

/** Resolve a table by its unique capability token (the customer path). */
export async function getTableByToken(
  token: string,
): Promise<LiveTable | null> {
  if (useSupabase) return rel.getTableByToken(token);
  return (
    (await readStoreBlob()).tables.find((x) =>
      constantTimeEqual(x.token, token),
    ) ?? null
  );
}

export async function setTableItems(
  num: string,
  items: OrderItem[],
  owner: string,
  branchId?: string | null,
): Promise<LiveTable | null> {
  if (useSupabase) return rel.setTableItems(num, items, owner, branchId);
  return mutateBlob((s) => {
    const t = s.tables.find(
      (x) => x.num === num && x.owner === owner && (!branchId || x.branchId === branchId),
    );
    if (!t) return { result: null, write: false };
    t.items = items;
    const setForAmount = settingsFor(s, owner);
    t.amount = orderAmount(items, setForAmount.taxRate, setForAmount.currency);
    t.paidQty = zeros(items.length);
    t.reservations = [];
    t.paid = 0;
    t.status = nextStatusForItems(items);
    return { result: t, write: true };
  });
}

export async function syncReservation(
  num: string,
  id: string,
  qty: number[],
  token: string,
): Promise<LiveTable | null> {
  if (useSupabase) return rel.syncReservation(num, id, qty, token);
  return mutateBlob((s) => {
    const t = s.tables.find((x) => constantTimeEqual(x.token, token));
    if (!t) return { result: null, write: false };
    const others = pruneReservations(t.reservations).filter((r) => r.id !== id);
    const mine = clampHold(t.items, qty);
    t.reservations = mine.some((n) => n > 0)
      ? [...others, { id, qty: mine, ts: Date.now() }]
      : others;
    return { result: t, write: true };
  });
}

export async function payTable(
  num: string,
  amount: number,
  opts: { id?: string; items?: number[]; method?: string; token: string },
): Promise<LiveTable | null> {
  if (useSupabase) return rel.payTable(num, amount, opts);
  return mutateBlob((s) => {
    const t = s.tables.find((x) => constantTimeEqual(x.token, opts.token));
    if (!t) return { result: null, write: false };
    if (t.items.length === 0) return { result: t, write: false };
    const set = settingsFor(s, t.owner);
    const { txn } = applyPayment(t, amount, opts, set.taxRate, set.currency);
    if (txn) {
      s.transactions.unshift(txn);
      if (s.transactions.length > MAX_TXN_HISTORY) {
        s.transactions.length = MAX_TXN_HISTORY;
      }
    }
    return { result: t, write: true };
  });
}

export async function setTableStatus(
  num: string,
  status: TableStatus,
  owner: string,
  branchId?: string | null,
): Promise<LiveTable | null> {
  if (useSupabase) return rel.setTableStatus(num, status, owner, branchId);
  return mutateBlob((s) => {
    const t = s.tables.find(
      (x) => x.num === num && x.owner === owner && (!branchId || x.branchId === branchId),
    );
    if (!t) return { result: null, write: false };
    t.status = status;
    if (status === "open") t.amount = "—";
    else if (t.amount === "—") t.amount = fmt(0, settingsFor(s, t.owner).currency);
    return { result: t, write: true };
  });
}

export async function deleteTable(
  num: string,
  owner: string,
  branchId?: string | null,
): Promise<boolean> {
  if (useSupabase) return rel.deleteTable(num, owner, branchId);
  return mutateBlob((s) => {
    const before = s.tables.length;
    s.tables = s.tables.filter(
      (x) => !(x.num === num && x.owner === owner && (!branchId || x.branchId === branchId)),
    );
    if (s.tables.length === before) return { result: false, write: false };
    return { result: true, write: true };
  });
}

export async function listTransactions(
  owner: string,
  opts: { branchId?: string | null } = {},
): Promise<Transaction[]> {
  if (useSupabase) return rel.listTransactions(owner, opts);
  // Disk backend has no per-txn branch dimension; branch filter is a no-op there.
  return (await readStoreBlob()).transactions.filter((t) => t.owner === owner);
}

// ===========================================================================
// ACCOUNTS (login)
// ===========================================================================

export async function findUserByEmail(
  email: string,
): Promise<AdminUser | null> {
  if (useSupabase) {
    await rel.ensureSuperadmin();
    return rel.findUserByEmail(email);
  }
  const norm = email.trim().toLowerCase();
  return (await readStoreBlob()).users.find((u) => u.email === norm) ?? null;
}

export async function getUserById(id: string): Promise<AdminUser | null> {
  if (useSupabase) return rel.getUserById(id);
  return (await readStoreBlob()).users.find((u) => u.id === id) ?? null;
}

/** Public view of a MANAGER account by id, or null (super console target). */
export async function getAdmin(id: string): Promise<PublicUser | null> {
  const u = await getUserById(id);
  return u && u.role === "manager" ? publicUser(u) : null;
}

/**
 * Resolve the live account behind a request's session, or null. Re-validates the
 * account every call, so a deleted, role-changed, OR EXPIRED account loses access
 * immediately (a stateless token otherwise stays valid until its own expiry).
 */
export async function authedUser(req: Request): Promise<AdminUser | null> {
  const session = await getSession(req);
  if (!session) return null;
  const u = await getUserById(session.sub);
  if (!u || u.role !== session.role) return null;
  if (isExpired(u)) return null; // trial lapsed → no access
  // Revocation: a token minted with a password fingerprint is rejected once the
  // password changes (fingerprint no longer matches), so a reset cuts every
  // outstanding session. Legacy tokens without `pv` are tolerated until expiry.
  if (session.pv && session.pv !== (await passwordFingerprint(u.passwordHash))) {
    return null;
  }
  // A branch-admin inherits its chain manager's lifecycle + scope. Fail closed
  // unless it has a branch AND a live, non-expired manager parent:
  //   • no branchId  → orphaned (its branch was deleted) → would resolve to an
  //     UNBRANCHED chain-wide scope (privilege escalation) → deny.
  //   • parent missing / not a manager / expired → the chain's trial lapsed, so
  //     a staff login must not keep the chain operating past the owner's gate.
  if (u.role === "admin") {
    if (!u.parentId || !u.branchId) return null;
    const parent = await getUserById(u.parentId);
    if (!parent || parent.role !== "manager" || isExpired(parent)) return null;
  }
  return u;
}

// ---------------------------------------------------------------------------
// Login throttling
// ---------------------------------------------------------------------------

const LOGIN_MAX_FAILS = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

export async function isLoginLocked(key: string): Promise<boolean> {
  if (useSupabase) return rel.isLoginLocked(key);
  const a = (await readStoreBlob()).loginAttempts[key];
  return !!a && a.lockedUntil > Date.now();
}

export async function recordLoginFailure(
  key: string,
  maxFails: number = LOGIN_MAX_FAILS,
): Promise<void> {
  if (useSupabase) return rel.recordLoginFailure(key, maxFails);
  await mutateBlob((s) => {
    const now = Date.now();
    for (const k of Object.keys(s.loginAttempts)) {
      const e = s.loginAttempts[k];
      if (e.lockedUntil <= now && e.windowEnd <= now) delete s.loginAttempts[k];
    }
    const a = s.loginAttempts[key];
    const inWindow = a && now < a.windowEnd;
    const fails = inWindow ? a.fails + 1 : 1;
    const windowEnd = inWindow ? a.windowEnd : now + LOGIN_WINDOW_MS;
    const lockedUntil = fails >= maxFails ? now + LOGIN_LOCK_MS : 0;
    s.loginAttempts[key] = { fails, windowEnd, lockedUntil };
    return { result: undefined, write: true };
  });
}

export async function clearLoginFailures(key: string): Promise<void> {
  if (useSupabase) return rel.clearLoginFailures(key);
  await mutateBlob((s) => {
    if (!s.loginAttempts[key]) return { result: undefined, write: false };
    delete s.loginAttempts[key];
    return { result: undefined, write: true };
  });
}

// ===========================================================================
// ADMIN MANAGEMENT (super console)
// ===========================================================================

export async function listAdmins(): Promise<PublicUser[]> {
  const base = useSupabase
    ? (await (async () => {
        await rel.ensureSuperadmin();
        return rel.listAdmins();
      })()).map(publicUser)
    : (await readStoreBlob()).users.filter((u) => u.role === "manager").map(publicUser);
  // Attach each admin's config (name/counts/caps/POS) for the super console.
  return Promise.all(
    base.map(async (u) => {
      const s = await getSettings(u.id);
      return {
        ...u,
        config: {
          name: s.name,
          tables: s.tables ?? 0,
          branches: s.branches ?? 0,
          maxTables: s.maxTables ?? 0,
          maxBranches: s.maxBranches ?? 0,
          posSystem: s.posSystem ?? "",
        },
      };
    }),
  );
}

export async function createAdmin(
  email: string,
  passwordHash: string,
  opts?: { source?: AccountSource; expiresAt?: string | null },
): Promise<PublicUser | null> {
  if (useSupabase) {
    const u = await rel.createAdmin(email, passwordHash, opts);
    return u ? publicUser(u) : null;
  }
  const norm = email.trim().toLowerCase();
  return mutateBlob((s) => {
    if (s.users.some((u) => u.email === norm)) {
      return { result: null, write: false };
    }
    const user: AdminUser = {
      id: globalThis.crypto.randomUUID(),
      email: norm,
      passwordHash,
      role: "manager",
      createdAt: new Date().toISOString(),
      source: opts?.source ?? "manual",
      expiresAt: opts?.expiresAt ?? null,
    };
    s.users.push(user);
    return { result: publicUser(user), write: true };
  });
}

export async function deleteAdmin(id: string): Promise<boolean> {
  if (useSupabase) return rel.deleteAdmin(id);
  return mutateBlob((s) => {
    const u = s.users.find((x) => x.id === id);
    if (!u || u.role !== "manager") return { result: false, write: false };
    // Cascade the manager's data AND its child branch-admins.
    s.users = s.users.filter((x) => x.id !== id && x.parentId !== id);
    s.tables = s.tables.filter((t) => t.owner !== id);
    s.branches = (s.branches ?? []).filter((b) => b.owner !== id);
    s.transactions = s.transactions.filter((t) => t.owner !== id);
    s.menuItems = (s.menuItems ?? []).filter((m) => m.owner !== id);
    s.orders = (s.orders ?? []).filter((o) => o.owner !== id);
    delete s.menus[id];
    delete s.settings[id];
    return { result: true, write: true };
  });
}

/** Extend an admin's expiry by `days` from max(now, current expiry). */
export async function renewAdmin(
  id: string,
  days: number = RENEW_DAYS,
): Promise<PublicUser | null> {
  // Renew extends a TRIAL's expiry. A never-expiring (manual) admin has no
  // expiry to extend — renewing must NOT silently impose one. No-op for those.
  const target = await getUserById(id);
  if (!target || (target.role !== "manager" && target.role !== "admin")) return null;
  if (target.expiresAt == null) return publicUser(target);
  if (useSupabase) {
    const u = await rel.renewAdmin(id, days);
    return u ? publicUser(u) : null;
  }
  return mutateBlob((s) => {
    const u = s.users.find(
      (x) => x.id === id && (x.role === "manager" || x.role === "admin"),
    );
    if (!u) return { result: null, write: false };
    const base = Math.max(
      Date.now(),
      u.expiresAt ? new Date(u.expiresAt).getTime() : Date.now(),
    );
    u.expiresAt = new Date(base + days * 86_400_000).toISOString();
    return { result: publicUser(u), write: true };
  });
}

/**
 * Edit an admin's email and/or password. Returns the updated account, null if no
 * such admin, or "duplicate" if the new email collides with another account.
 */
export async function updateAdmin(
  id: string,
  patch: { email?: string; passwordHash?: string },
): Promise<PublicUser | null | "duplicate"> {
  if (useSupabase) {
    const r = await rel.updateAdmin(id, patch);
    if (r === "duplicate") return "duplicate";
    return r ? publicUser(r) : null;
  }
  const newEmail =
    typeof patch.email === "string" ? patch.email.trim().toLowerCase() : undefined;
  return mutateBlob<PublicUser | null | "duplicate">((s) => {
    const u = s.users.find((x) => x.id === id && x.role === "manager");
    if (!u) return { result: null, write: false };
    if (newEmail && s.users.some((x) => x.id !== id && x.email === newEmail)) {
      return { result: "duplicate", write: false };
    }
    if (newEmail) u.email = newEmail;
    if (typeof patch.passwordHash === "string") u.passwordHash = patch.passwordHash;
    return { result: publicUser(u), write: true };
  });
}

// ---------------------------------------------------------------------------
// Trial-admin provisioning (marketing demo form)
// ---------------------------------------------------------------------------

export interface TrialProvision {
  /** created = brand-new trial issued; exists = email already has an account. */
  status: "created" | "exists";
  account?: PublicUser;
  /** Plaintext password — only present on `created`; email it, never store. */
  password?: string;
  expiresAt?: string;
}

/**
 * Provision a 7-day trial admin for a demo request. Strictly one trial per email:
 * if ANY account already exists for the email (trial, manual, or super), nothing
 * is created or renewed — the caller emails a "contact sales" note instead.
 * Self-service renewal is intentionally impossible; only the superadmin renews.
 */
/** Trial caps for self-service signups (super-created accounts get whatever the
 *  super sets). Sourced from SITE so the /demo signup copy states the SAME
 *  numbers we enforce here — a prospect is never surprised by a silent cap. */
const TRIAL_MAX_TABLES = SITE.trial.maxTables;
const TRIAL_MAX_BRANCHES = SITE.trial.maxBranches;

export async function provisionTrialAdmin(
  email: string,
  restaurant: string,
  profile?: {
    tables?: number;
    branches?: number;
    posSystem?: string;
  },
): Promise<TrialProvision> {
  const norm = email.trim().toLowerCase();
  if (await findUserByEmail(norm)) return { status: "exists" };

  const expiresAt = new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString();
  const password = genPassword();
  const created = await createAdmin(norm, await hashPassword(password), {
    source: "demo",
    expiresAt,
  });
  // A null here means a concurrent insert won the unique race — already exists.
  if (!created) return { status: "exists" };

  // Seed the new trial's settings from the signup form so the restaurant name,
  // size, and chosen POS are pre-filled when they first open the dashboard.
  // Best-effort: a settings write failure must not fail the provisioning.
  try {
    await setSettings(created.id, {
      name: restaurant.trim().slice(0, 80),
      tables: profile?.tables,
      // Trial accounts are capped to a single branch (multi-branch is a paid
      // capability). maxBranches enforces it through the normal cap mechanism,
      // so the super can later lift it per account. Form branch count still on lead.
      branches: TRIAL_MAX_BRANCHES,
      maxBranches: TRIAL_MAX_BRANCHES,
      // Default table ceiling for self-service trials (a super-created account
      // gets whatever the super sets). Plenty to evaluate; caps cost-abuse.
      maxTables: TRIAL_MAX_TABLES,
      posSystem: profile?.posSystem,
    });
  } catch (e) {
    console.warn(
      "store: trial settings seed failed (non-fatal):",
      e instanceof Error ? e.message : e,
    );
  }
  return { status: "created", account: created, password, expiresAt };
}

// ===========================================================================
// BRANCH-ADMINS (managed by a chain manager)
// ===========================================================================

export async function listBranchAdmins(parentId: string): Promise<PublicUser[]> {
  if (useSupabase) return (await rel.listBranchAdmins(parentId)).map(publicUser);
  return (await readStoreBlob()).users
    .filter((u) => u.role === "admin" && u.parentId === parentId)
    .map(publicUser);
}

export async function getBranchAdmin(
  parentId: string,
  id: string,
): Promise<PublicUser | null> {
  if (useSupabase) {
    const u = await rel.getBranchAdmin(parentId, id);
    return u ? publicUser(u) : null;
  }
  const u = (await readStoreBlob()).users.find(
    (x) => x.id === id && x.role === "admin" && x.parentId === parentId,
  );
  return u ? publicUser(u) : null;
}

export async function createBranchAdmin(
  parentId: string,
  branchId: string,
  email: string,
  passwordHash: string,
): Promise<PublicUser | null> {
  if (useSupabase) {
    const u = await rel.createBranchAdmin(parentId, branchId, email, passwordHash);
    return u ? publicUser(u) : null;
  }
  const norm = email.trim().toLowerCase();
  return mutateBlob((s) => {
    if (s.users.some((u) => u.email === norm)) return { result: null, write: false };
    const user: AdminUser = {
      id: globalThis.crypto.randomUUID(),
      email: norm,
      passwordHash,
      role: "admin",
      createdAt: new Date().toISOString(),
      source: "manual",
      expiresAt: null,
      parentId,
      branchId,
    };
    s.users.push(user);
    return { result: publicUser(user), write: true };
  });
}

export async function updateBranchAdmin(
  parentId: string,
  id: string,
  patch: { email?: string; passwordHash?: string; branchId?: string },
): Promise<PublicUser | null | "duplicate"> {
  if (useSupabase) {
    const r = await rel.updateBranchAdmin(parentId, id, patch);
    if (r === "duplicate") return "duplicate";
    return r ? publicUser(r) : null;
  }
  const newEmail =
    typeof patch.email === "string" ? patch.email.trim().toLowerCase() : undefined;
  return mutateBlob<PublicUser | null | "duplicate">((s) => {
    const u = s.users.find(
      (x) => x.id === id && x.role === "admin" && x.parentId === parentId,
    );
    if (!u) return { result: null, write: false };
    if (newEmail && s.users.some((x) => x.id !== id && x.email === newEmail)) {
      return { result: "duplicate", write: false };
    }
    if (newEmail) u.email = newEmail;
    if (typeof patch.passwordHash === "string") u.passwordHash = patch.passwordHash;
    if (typeof patch.branchId === "string") u.branchId = patch.branchId;
    return { result: publicUser(u), write: true };
  });
}

export async function deleteBranchAdmin(
  parentId: string,
  id: string,
): Promise<boolean> {
  if (useSupabase) return rel.deleteBranchAdmin(parentId, id);
  return mutateBlob((s) => {
    const before = s.users.length;
    s.users = s.users.filter(
      (x) => !(x.id === id && x.role === "admin" && x.parentId === parentId),
    );
    return { result: s.users.length < before, write: s.users.length < before };
  });
}

// ===========================================================================
// CONTACT CHANNEL (manager → super messages)
// ===========================================================================

export async function createManagerMessage(
  managerId: string,
  subject: string,
  body: string,
): Promise<ManagerMessage> {
  if (useSupabase) return rel.createManagerMessage(managerId, subject, body);
  return mutateBlob((s) => {
    const msg: ManagerMessage = {
      id: globalThis.crypto.randomUUID(),
      managerId,
      subject,
      body,
      status: "open",
      createdAt: new Date().toISOString(),
    };
    s.managerMessages = [msg, ...(s.managerMessages ?? [])];
    return { result: msg, write: true };
  });
}

export async function listManagerMessages(): Promise<ManagerMessage[]> {
  if (useSupabase) return rel.listManagerMessages();
  const s = await readStoreBlob();
  return (s.managerMessages ?? []).map((m) => ({
    ...m,
    managerEmail: s.users.find((u) => u.id === m.managerId)?.email ?? "",
  }));
}

export async function listManagerMessagesFor(
  managerId: string,
): Promise<ManagerMessage[]> {
  if (useSupabase) return rel.listManagerMessagesFor(managerId);
  return ((await readStoreBlob()).managerMessages ?? []).filter(
    (m) => m.managerId === managerId,
  );
}

export async function setManagerMessageStatus(
  id: string,
  status: "open" | "resolved",
): Promise<boolean> {
  if (useSupabase) return rel.setManagerMessageStatus(id, status);
  return mutateBlob((s) => {
    const m = (s.managerMessages ?? []).find((x) => x.id === id);
    if (!m) return { result: false, write: false };
    m.status = status;
    return { result: true, write: true };
  });
}

export async function replyManagerMessage(
  id: string,
  reply: string,
): Promise<(ManagerMessage & { managerEmail: string }) | null> {
  if (useSupabase) return rel.replyManagerMessage(id, reply);
  return mutateBlob((s) => {
    const m = (s.managerMessages ?? []).find((x) => x.id === id);
    if (!m) return { result: null, write: false };
    m.reply = reply;
    m.repliedAt = new Date().toISOString();
    m.status = "resolved";
    const email = s.users.find((u) => u.id === m.managerId)?.email ?? "";
    return { result: { ...m, managerEmail: email }, write: true };
  });
}

/** Self-service password change: set an account's password hash by id (any role). */
export async function setAccountPassword(
  id: string,
  passwordHash: string,
): Promise<boolean> {
  if (useSupabase) return rel.setAccountPassword(id, passwordHash);
  return mutateBlob((s) => {
    const u = s.users.find((x) => x.id === id);
    if (!u) return { result: false, write: false };
    u.passwordHash = passwordHash;
    return { result: true, write: true };
  });
}

// ===========================================================================
// MENUS
// ===========================================================================

// Disk backend: menus are keyed per (owner, branch). A null branch is the chain
// default and keeps the bare-owner key for backward compatibility.
function diskMenuKey(owner: string, branchId?: string | null): string {
  return branchId ? `${owner}:${branchId}` : owner;
}

export async function getMenu(
  owner: string,
  branchId?: string | null,
): Promise<MenuMeta | null> {
  if (useSupabase) return rel.getMenu(owner, branchId);
  return (await readStoreBlob()).menus[diskMenuKey(owner, branchId)] ?? null;
}

export async function getMenuForTable(
  num: string,
  token: string,
): Promise<MenuMeta | null> {
  if (useSupabase) return rel.getMenuForTable(num, token);
  const s = await readStoreBlob();
  const t = s.tables.find((x) => constantTimeEqual(x.token, token));
  if (!t) return null;
  return (
    s.menus[diskMenuKey(t.owner, t.branchId)] ?? s.menus[t.owner] ?? null
  );
}

export async function setMenu(
  owner: string,
  meta: MenuMeta,
  branchId?: string | null,
): Promise<void> {
  if (useSupabase) return rel.setMenu(owner, meta, branchId);
  await mutateBlob((s) => {
    s.menus[diskMenuKey(owner, branchId)] = meta;
    return { result: undefined, write: true };
  });
}

export async function clearMenu(
  owner: string,
  branchId?: string | null,
): Promise<void> {
  if (useSupabase) return rel.clearMenu(owner, branchId);
  await mutateBlob((s) => {
    delete s.menus[diskMenuKey(owner, branchId)];
    return { result: undefined, write: true };
  });
}

// ===========================================================================
// SETTINGS
// ===========================================================================

export async function getSettings(owner: string): Promise<RestaurantSettings> {
  if (useSupabase) return rel.getSettings(owner);
  return diskSettings(await readStoreBlob(), owner);
}

export async function setSettings(
  owner: string,
  patch: Partial<RestaurantSettings>,
): Promise<RestaurantSettings> {
  // Snapshot current counts so we only reconcile rows when a count actually
  // changes (avoids refilling a deliberately-deleted table/branch on an
  // unrelated save).
  const prev = await getSettings(owner);
  let next: RestaurantSettings;
  if (useSupabase) {
    next = await rel.setSettings(owner, patch);
  } else {
    // Merge against the DECRYPTED current config, then encrypt secrets for storage.
    const cur = await diskSettings(await readStoreBlob(), owner);
    next = mergeSettings(cur, patch);
    const encConfig = await encryptPosConfig(next.posSystem, next.posConfig);
    await mutateBlob((s) => {
      s.settings[owner] = { ...next, posConfig: encConfig };
      return { result: undefined, write: true };
    });
  }
  // Provision rows up to the configured counts (capped by max), only when the
  // count changed. Non-destructive: lowering a count never deletes rows.
  if ((next.branches ?? 0) !== (prev.branches ?? 0)) {
    await reconcileBranches(owner, next.branches);
  }
  if ((next.tables ?? 0) !== (prev.tables ?? 0)) {
    await reconcileTables(owner, next.tables, next.maxTables);
  }
  return next;
}

/** Max rows we'll auto-provision from a settings count (guards typos). */
const MAX_AUTO_BRANCHES = 50;
const MAX_AUTO_TABLES = 500;

async function reconcileBranches(owner: string, count: number | undefined): Promise<void> {
  const target = Math.min(count ?? 1, MAX_AUTO_BRANCHES);
  if (target <= 1) return;
  const existing = await listBranches(owner); // also ensures the default "Main"
  if (existing.length >= target) return;
  for (let k = existing.length; k < target; k++) {
    await createBranch(owner, `Branch ${k + 1}`, false);
  }
}

/** Provision tables in the default branch up to `count`, capped by `max` and
 *  MAX_AUTO_TABLES. Non-destructive; only ever creates the missing rows. */
async function reconcileTables(
  owner: string,
  count: number | undefined,
  max: number | undefined,
): Promise<void> {
  let target = count ?? 0;
  if (max && max > 0) target = Math.min(target, max);
  target = Math.min(target, MAX_AUTO_TABLES);
  if (target <= 0) return;
  const existing = (await listTables(owner)).length;
  if (existing >= target) return;
  const branches = await listBranches(owner);
  const defaultBranchId = branches[0]?.id;
  for (let k = existing; k < target; k++) {
    await createTable(owner, defaultBranchId);
  }
}

/** Owner's hard table cap (0/unset = unlimited): the super-set maxTables. The
 *  count is NOT a cap — leaving Max blank means no limit, by design. */
export async function tableCap(owner: string): Promise<number> {
  const s = await getSettings(owner);
  return s.maxTables && s.maxTables > 0 ? s.maxTables : 0;
}

/** Owner's hard branch cap (0/unset = unlimited): the super-set maxBranches. */
export async function branchCap(owner: string): Promise<number> {
  const s = await getSettings(owner);
  return s.maxBranches && s.maxBranches > 0 ? s.maxBranches : 0;
}

/**
 * Provision a newly-created admin's account from the super console: restaurant
 * name, table/branch counts + caps, and the chosen POS + its primary API key.
 * Best-effort — a failure here must not invalidate the created account.
 */
export async function seedAdminAccount(
  owner: string,
  opts: {
    name?: string;
    tables?: number;
    maxTables?: number;
    branches?: number;
    maxBranches?: number;
    posSystem?: string;
    posApiKey?: string;
  },
): Promise<void> {
  // Map the single provided API key onto the chosen POS's primary secret field.
  let posConfig: Record<string, string> | undefined;
  if (opts.posSystem && opts.posApiKey?.trim()) {
    const secretKey = posSecretKeys(opts.posSystem)[0];
    if (secretKey) posConfig = { [secretKey]: opts.posApiKey.trim() };
  }
  await setSettings(owner, {
    name: opts.name,
    tables: opts.tables,
    maxTables: opts.maxTables,
    branches: opts.branches,
    maxBranches: opts.maxBranches,
    posSystem: opts.posSystem,
    posConfig,
  });
}

export async function getPublicRestaurant(
  token: string,
): Promise<{ name: string; taxRate: number; currency: Currency } | null> {
  if (useSupabase) return rel.getPublicRestaurant(token);
  const s = await readStoreBlob();
  const t = s.tables.find((x) => constantTimeEqual(x.token, token));
  if (!t) return null;
  const set = settingsFor(s, t.owner);
  const user = s.users.find((u) => u.id === t.owner);
  const fallback = user ? user.email.split("@")[0] : "Restaurant";
  return { name: set.name || fallback, taxRate: set.taxRate, currency: set.currency };
}

// ===========================================================================
// LEADS
// ===========================================================================

export async function addLead(input: LeadInput): Promise<Lead> {
  if (useSupabase) return rel.addLead(input);
  return mutateBlob((s) => {
    const n = normalizeLead(input);
    const lead: Lead = {
      id: globalThis.crypto.randomUUID(),
      name: n.name,
      email: n.email,
      restaurant: n.restaurant,
      kind: n.kind,
      phone: n.phone || undefined,
      tables: n.tables || undefined,
      branches: n.branches || undefined,
      posSystem: n.posSystem || undefined,
      preferredDates: n.preferredDates || undefined,
      message: n.message || undefined,
      ts: new Date().toISOString(),
    };
    s.leads.unshift(lead);
    if (s.leads.length > MAX_LEADS) s.leads.length = MAX_LEADS;
    return { result: lead, write: true };
  });
}

export async function listLeads(): Promise<Lead[]> {
  if (useSupabase) return rel.listLeads();
  return (await readStoreBlob()).leads;
}

// ===========================================================================
// BRANCHES (multi-location)
// ===========================================================================

export async function listBranches(owner: string): Promise<Branch[]> {
  if (useSupabase) return rel.listBranches(owner);
  const blob = await readStoreBlob();
  let mine = (blob.branches ?? []).filter((b) => b.owner === owner);
  if (mine.length === 0) {
    const def: Branch = {
      id: globalThis.crypto.randomUUID(),
      owner,
      name: "Main",
      externalId: "",
      posSystem: "",
      posConfig: {},
      createdAt: new Date().toISOString(),
    };
    await mutateBlob((s) => {
      s.branches = [...(s.branches ?? []), def];
      return { result: undefined, write: true };
    });
    mine = [def];
  }
  return Promise.all(
    mine.map(async (b) => ({ ...b, posConfig: await decryptPosConfig(b.posSystem, b.posConfig) })),
  );
}

export async function createBranch(
  owner: string,
  name: string,
  ensureDefault = true,
): Promise<Branch> {
  if (useSupabase) return rel.createBranch(owner, name, ensureDefault);
  if (ensureDefault) await listBranches(owner); // ensure the default exists first
  const branch: Branch = {
    id: globalThis.crypto.randomUUID(),
    owner,
    name: name.trim().slice(0, 80) || "Branch",
    externalId: "",
    posSystem: "",
    posConfig: {},
    createdAt: new Date().toISOString(),
  };
  await mutateBlob((s) => {
    s.branches = [...(s.branches ?? []), branch];
    return { result: undefined, write: true };
  });
  return branch;
}

export async function updateBranch(
  owner: string,
  id: string,
  patch: { name?: string; externalId?: string; posSystem?: string; posConfig?: Record<string, string> },
): Promise<Branch | null> {
  if (useSupabase) return rel.updateBranch(owner, id, patch);
  const blob = await readStoreBlob();
  const cur = (blob.branches ?? []).find((b) => b.id === id && b.owner === owner);
  if (!cur) return null;
  const posSystem = typeof patch.posSystem === "string" ? patch.posSystem : cur.posSystem;
  const curPlain = await decryptPosConfig(cur.posSystem, cur.posConfig);
  let posConfig = curPlain;
  if (patch.posConfig) posConfig = sanitizePosConfig(posSystem, { ...curPlain, ...patch.posConfig });
  else if (posSystem !== cur.posSystem) posConfig = sanitizePosConfig(posSystem, curPlain);
  const enc = await encryptPosConfig(posSystem, posConfig);
  const updated: Branch = {
    ...cur,
    name: typeof patch.name === "string" ? patch.name.trim().slice(0, 80) || "Branch" : cur.name,
    externalId:
      typeof patch.externalId === "string" ? patch.externalId.trim().slice(0, 120) : cur.externalId,
    posSystem,
    posConfig: enc,
  };
  await mutateBlob((s) => {
    s.branches = (s.branches ?? []).map((b) => (b.id === id && b.owner === owner ? updated : b));
    return { result: undefined, write: true };
  });
  return { ...updated, posConfig: await decryptPosConfig(posSystem, enc) };
}

export async function deleteBranch(
  owner: string,
  id: string,
): Promise<{ ok: boolean; reason?: "last" | "not-found" }> {
  if (useSupabase) return rel.deleteBranch(owner, id);
  const branches = await listBranches(owner);
  if (branches.length <= 1) return { ok: false, reason: "last" };
  const fallback = branches.find((b) => b.id !== id);
  if (!fallback) return { ok: false, reason: "last" };
  return mutateBlob<{ ok: boolean; reason?: "last" | "not-found" }>((s) => {
    const exists = (s.branches ?? []).some((b) => b.id === id && b.owner === owner);
    if (!exists) return { result: { ok: false, reason: "not-found" }, write: false };
    s.branches = (s.branches ?? []).filter((b) => !(b.id === id && b.owner === owner));
    s.tables = s.tables.map((t) =>
      t.owner === owner && t.branchId === id ? { ...t, branchId: fallback.id } : t,
    );
    return { result: { ok: true }, write: true };
  });
}

// ===========================================================================
// MENU ITEMS + ORDERS (optional in-app ordering)
// ===========================================================================

export async function listMenuItems(
  owner: string,
  branchId?: string | null,
): Promise<MenuItem[]> {
  if (useSupabase) return rel.listMenuItems(owner, branchId);
  return (await readStoreBlob()).menuItems!
    .filter(
      (m) =>
        m.owner === owner &&
        !m.archived &&
        (!branchId || m.branchId === branchId || m.branchId == null),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
}

export async function createMenuItem(
  owner: string,
  input: { name: string; price: number; category?: string; description?: string },
  branchId?: string | null,
): Promise<MenuItem> {
  if (useSupabase) return rel.createMenuItem(owner, input, branchId);
  return mutateBlob((s) => {
    const now = new Date().toISOString();
    const maxSort = (s.menuItems ?? [])
      .filter((m) => m.owner === owner)
      .reduce((a, m) => Math.max(a, m.sortOrder), 0);
    const item: MenuItem = {
      id: globalThis.crypto.randomUUID(),
      owner,
      branchId: branchId ?? null,
      name: input.name,
      price: input.price,
      category: input.category ?? "",
      description: input.description ?? "",
      available: true,
      sortOrder: maxSort + 1,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    s.menuItems = [...(s.menuItems ?? []), item];
    return { result: item, write: true };
  });
}

export async function updateMenuItem(
  owner: string,
  id: string,
  patch: Partial<Pick<MenuItem, "name" | "price" | "category" | "description" | "available" | "sortOrder">>,
  branchId?: string | null,
): Promise<MenuItem | null> {
  if (useSupabase) return rel.updateMenuItem(owner, id, patch, branchId);
  return mutateBlob((s) => {
    const m = (s.menuItems ?? []).find(
      (x) => x.id === id && x.owner === owner && (!branchId || x.branchId === branchId),
    );
    if (!m) return { result: null, write: false };
    if (patch.name !== undefined) m.name = patch.name;
    if (patch.price !== undefined) m.price = patch.price;
    if (patch.category !== undefined) m.category = patch.category;
    if (patch.description !== undefined) m.description = patch.description;
    if (patch.available !== undefined) m.available = patch.available;
    if (patch.sortOrder !== undefined) m.sortOrder = patch.sortOrder;
    m.updatedAt = new Date().toISOString();
    return { result: m, write: true };
  });
}

export async function deleteMenuItem(
  owner: string,
  id: string,
  branchId?: string | null,
): Promise<boolean> {
  if (useSupabase) return rel.deleteMenuItem(owner, id, branchId);
  return mutateBlob((s) => {
    const before = (s.menuItems ?? []).length;
    s.menuItems = (s.menuItems ?? []).filter(
      (m) => !(m.id === id && m.owner === owner && (!branchId || m.branchId === branchId)),
    );
    return { result: s.menuItems.length < before, write: s.menuItems.length < before };
  });
}

/** Customer: available items for the table behind `token`. */
export async function getPublicMenuItems(token: string): Promise<MenuItem[]> {
  if (useSupabase) return rel.getPublicMenuItems(token);
  const s = await readStoreBlob();
  const t = s.tables.find((x) => constantTimeEqual(x.token, token));
  if (!t) return [];
  // Scope the diner to this table's branch items + shared (null-branch) items,
  // mirroring the relational backend so the two never drift.
  return (s.menuItems ?? [])
    .filter(
      (m) =>
        m.owner === t.owner &&
        m.available &&
        !m.archived &&
        (!t.branchId || m.branchId === t.branchId || m.branchId == null),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
}

/** Customer: place an order (prices snapshotted server-side from live items). */
export async function placeOrder(
  token: string,
  requested: { menuItemId?: string; qty?: number; comment?: string }[],
): Promise<Order | null> {
  if (useSupabase) return rel.placeOrder(token, requested);
  const available = await getPublicMenuItems(token);
  const { lines, total } = buildOrderLines(available, requested);
  if (lines.length === 0) return null;
  return mutateBlob((s) => {
    const t = s.tables.find((x) => constantTimeEqual(x.token, token));
    if (!t) return { result: null, write: false };
    const order: Order = {
      id: globalThis.crypto.randomUUID(),
      owner: t.owner,
      branchId: t.branchId ?? null,
      tableId: t.token, // disk backend has no surrogate id; token is stable enough
      tableNum: t.num,
      status: "placed",
      lines: lines.map((l, i) => ({ id: String(i), ...l })),
      total,
      createdAt: new Date().toISOString(),
    };
    s.orders = [order, ...(s.orders ?? [])];
    return { result: order, write: true };
  });
}

export async function listOrders(
  owner: string,
  opts: { activeOnly?: boolean; branchId?: string | null } = {},
): Promise<Order[]> {
  if (useSupabase) return rel.listOrders(owner, opts);
  let all = (await readStoreBlob()).orders!
    .filter((o) => o.owner === owner)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (opts.branchId) all = all.filter((o) => o.branchId === opts.branchId);
  return opts.activeOnly
    ? all.filter((o) => o.status === "placed" || o.status === "preparing")
    : all;
}

export async function updateOrderStatus(
  owner: string,
  id: string,
  status: OrderStatus,
  branchId?: string | null,
): Promise<Order | null> {
  if (useSupabase) return rel.updateOrderStatus(owner, id, status, branchId);
  return mutateBlob((s) => {
    const o = (s.orders ?? []).find(
      (x) => x.id === id && x.owner === owner && (!branchId || x.branchId === branchId),
    );
    if (!o) return { result: null, write: false };
    o.status = status;
    return { result: o, write: true };
  });
}
