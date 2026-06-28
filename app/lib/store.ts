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
import { constantTimeEqual, getSession, hashPassword } from "./auth";
import { useSupabase } from "./supabase";
import * as rel from "./store-sb";
import { fmt, type Currency } from "./data";
import {
  applyPayment,
  buildOrderLines,
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
  };
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
    transactions: [],
    leads: [],
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
    leads: Array.isArray(s.leads) ? s.leads : [],
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
  // Local-dev fallback only (production uses the relational Supabase backend).
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

export async function listTables(owner: string): Promise<LiveTable[]> {
  if (useSupabase) return rel.listTables(owner);
  return (await readStoreBlob()).tables.filter((t) => t.owner === owner);
}

export async function createTable(owner: string): Promise<LiveTable> {
  if (useSupabase) return rel.createTable(owner);
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
): Promise<LiveTable | null> {
  if (useSupabase) return rel.setTableItems(num, items, owner);
  return mutateBlob((s) => {
    const t = s.tables.find((x) => x.num === num && x.owner === owner);
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
    const { txn } = applyPayment(t, amount, opts, settingsFor(s, t.owner).taxRate);
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
): Promise<LiveTable | null> {
  if (useSupabase) return rel.setTableStatus(num, status, owner);
  return mutateBlob((s) => {
    const t = s.tables.find((x) => x.num === num && x.owner === owner);
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
): Promise<boolean> {
  if (useSupabase) return rel.deleteTable(num, owner);
  return mutateBlob((s) => {
    const before = s.tables.length;
    s.tables = s.tables.filter((x) => !(x.num === num && x.owner === owner));
    if (s.tables.length === before) return { result: false, write: false };
    return { result: true, write: true };
  });
}

export async function listTransactions(owner: string): Promise<Transaction[]> {
  if (useSupabase) return rel.listTransactions(owner);
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

export async function recordLoginFailure(key: string): Promise<void> {
  if (useSupabase) return rel.recordLoginFailure(key);
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
    const lockedUntil = fails >= LOGIN_MAX_FAILS ? now + LOGIN_LOCK_MS : 0;
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
  if (useSupabase) {
    await rel.ensureSuperadmin();
    return (await rel.listAdmins()).map(publicUser);
  }
  const s = await readStoreBlob();
  return s.users.filter((u) => u.role === "admin").map(publicUser);
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
      role: "admin",
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
    if (!u || u.role !== "admin") return { result: false, write: false };
    s.users = s.users.filter((x) => x.id !== id);
    s.tables = s.tables.filter((t) => t.owner !== id);
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
  if (useSupabase) {
    const u = await rel.renewAdmin(id, days);
    return u ? publicUser(u) : null;
  }
  return mutateBlob((s) => {
    const u = s.users.find((x) => x.id === id && x.role === "admin");
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
    const u = s.users.find((x) => x.id === id && x.role === "admin");
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
export async function provisionTrialAdmin(
  email: string,
  _restaurant: string,
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
  return { status: "created", account: created, password, expiresAt };
}

// ===========================================================================
// MENUS
// ===========================================================================

export async function getMenu(owner: string): Promise<MenuMeta | null> {
  if (useSupabase) return rel.getMenu(owner);
  return (await readStoreBlob()).menus[owner] ?? null;
}

export async function getMenuForTable(
  num: string,
  token: string,
): Promise<MenuMeta | null> {
  if (useSupabase) return rel.getMenuForTable(num, token);
  const s = await readStoreBlob();
  const t = s.tables.find((x) => constantTimeEqual(x.token, token));
  return t ? s.menus[t.owner] ?? null : null;
}

export async function setMenu(owner: string, meta: MenuMeta): Promise<void> {
  if (useSupabase) return rel.setMenu(owner, meta);
  await mutateBlob((s) => {
    s.menus[owner] = meta;
    return { result: undefined, write: true };
  });
}

export async function clearMenu(owner: string): Promise<void> {
  if (useSupabase) return rel.clearMenu(owner);
  await mutateBlob((s) => {
    delete s.menus[owner];
    return { result: undefined, write: true };
  });
}

// ===========================================================================
// SETTINGS
// ===========================================================================

export async function getSettings(owner: string): Promise<RestaurantSettings> {
  if (useSupabase) return rel.getSettings(owner);
  return settingsFor(await readStoreBlob(), owner);
}

export async function setSettings(
  owner: string,
  patch: Partial<RestaurantSettings>,
): Promise<RestaurantSettings> {
  if (useSupabase) return rel.setSettings(owner, patch);
  return mutateBlob((s) => {
    const next = mergeSettings(settingsFor(s, owner), patch);
    s.settings[owner] = next;
    return { result: next, write: true };
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

export async function addLead(input: {
  name: string;
  email: string;
  restaurant: string;
}): Promise<Lead> {
  if (useSupabase) return rel.addLead(input);
  return mutateBlob((s) => {
    const lead: Lead = {
      id: globalThis.crypto.randomUUID(),
      name: input.name.trim().slice(0, 120),
      email: input.email.trim().slice(0, 200),
      restaurant: input.restaurant.trim().slice(0, 120),
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
// MENU ITEMS + ORDERS (optional in-app ordering)
// ===========================================================================

export async function listMenuItems(owner: string): Promise<MenuItem[]> {
  if (useSupabase) return rel.listMenuItems(owner);
  return (await readStoreBlob()).menuItems!
    .filter((m) => m.owner === owner && !m.archived)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
}

export async function createMenuItem(
  owner: string,
  input: { name: string; price: number; category?: string; description?: string },
): Promise<MenuItem> {
  if (useSupabase) return rel.createMenuItem(owner, input);
  return mutateBlob((s) => {
    const now = new Date().toISOString();
    const maxSort = (s.menuItems ?? [])
      .filter((m) => m.owner === owner)
      .reduce((a, m) => Math.max(a, m.sortOrder), 0);
    const item: MenuItem = {
      id: globalThis.crypto.randomUUID(),
      owner,
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
): Promise<MenuItem | null> {
  if (useSupabase) return rel.updateMenuItem(owner, id, patch);
  return mutateBlob((s) => {
    const m = (s.menuItems ?? []).find((x) => x.id === id && x.owner === owner);
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

export async function deleteMenuItem(owner: string, id: string): Promise<boolean> {
  if (useSupabase) return rel.deleteMenuItem(owner, id);
  return mutateBlob((s) => {
    const before = (s.menuItems ?? []).length;
    s.menuItems = (s.menuItems ?? []).filter(
      (m) => !(m.id === id && m.owner === owner),
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
  return (s.menuItems ?? [])
    .filter((m) => m.owner === t.owner && m.available && !m.archived)
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
  opts: { activeOnly?: boolean } = {},
): Promise<Order[]> {
  if (useSupabase) return rel.listOrders(owner, opts);
  const all = (await readStoreBlob()).orders!
    .filter((o) => o.owner === owner)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return opts.activeOnly
    ? all.filter((o) => o.status === "placed" || o.status === "preparing")
    : all;
}

export async function updateOrderStatus(
  owner: string,
  id: string,
  status: OrderStatus,
): Promise<Order | null> {
  if (useSupabase) return rel.updateOrderStatus(owner, id, status);
  return mutateBlob((s) => {
    const o = (s.orders ?? []).find((x) => x.id === id && x.owner === owner);
    if (!o) return { result: null, write: false };
    o.status = status;
    return { result: o, write: true };
  });
}
