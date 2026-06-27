import { promises as fs } from "fs";
import path from "path";
import { billDue, fmt } from "./data";
import { getSession, hashPassword } from "./auth";
import type {
  AdminUser,
  LiveTable,
  MenuMeta,
  OrderItem,
  Reservation,
  Role,
  Store,
  TableStatus,
  Transaction,
} from "./types";

function orderAmount(items: OrderItem[]): string {
  if (!items.length) return "—";
  // Show the actual bill (subtotal + tax) so the admin "amount" matches what
  // `paid` and the customer's total are measured against.
  return fmt(billDue(items));
}

const zeros = (n: number): number[] => Array.from({ length: n }, () => 0);

/** Reservations older than this (ms) are considered abandoned and dropped. */
const RESV_TTL_MS = 8000;

function pruneReservations(rs: Reservation[]): Reservation[] {
  const cutoff = Date.now() - RESV_TTL_MS;
  return (rs ?? []).filter((r) => r.ts >= cutoff && r.qty.some((q) => q > 0));
}

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");
export const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const KV_KEY = "qpay:store";
// Backend precedence: Supabase (shared serverless store) → Vercel KV → disk.
const useSupabase = !!process.env.SUPABASE_URL;
const useKv = !!process.env.KV_REST_API_URL;
const SB_TABLE = "store";

// createClient() wants the bare project URL (https://xxxx.supabase.co), but the
// Supabase dashboard also surfaces the REST endpoint (…/rest/v1/) and people
// paste that into the env by mistake — which silently breaks every query. Strip
// any /rest/v1 suffix and trailing slash so either form works.
function supabaseUrl(): string {
  const raw = (process.env.SUPABASE_URL ?? "").trim();
  return raw.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

// Lazily-created, memoized Supabase client (dynamic import so the dep isn't
// bundled when running in disk/KV mode).
let _sb: import("@supabase/supabase-js").SupabaseClient | undefined;
async function sb() {
  if (!_sb) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
      // Misconfiguration: URL set but no service-role key. Fail loudly rather
      // than letting writes silently no-op (which looks like "state resets").
      throw new Error(
        "store: SUPABASE_URL is set but SUPABASE_SERVICE_ROLE_KEY is missing",
      );
    }
    const { createClient } = await import("@supabase/supabase-js");
    _sb = createClient(supabaseUrl(), key, {
      auth: { persistSession: false },
    });
  }
  return _sb;
}

// The single super account that owns the admin console. Overridable via env;
// defaults match the credentials provisioned for this deployment. The password
// is only ever stored as a PBKDF2 digest (hashed in ensureSuperadmin).
const SUPER_EMAIL = (process.env.SUPERADMIN_EMAIL || "AliTheAdmin@gmail.com")
  .trim()
  .toLowerCase();
const SUPER_PASSWORD = process.env.SUPERADMIN_PASSWORD || "QPayAdmin_1";

// A fresh store has NO tables or transactions and NO admins — every admin is
// created by the super account and starts with an empty, isolated dashboard.
// The super account itself is injected lazily by ensureSuperadmin (it needs an
// async hash, which seed() can't do).
function seed(): Store {
  return {
    tables: [],
    transactions: [],
    menus: {},
    users: [],
    loginAttempts: {},
    seq: 0,
    version: 0,
  };
}

const newToken = (): string => globalThis.crypto.randomUUID();

// Backfill fields added after a store was first written (e.g. table.items),
// so stores created by older versions don't crash newer code.
function normalize(s: Store): Store {
  return {
    // Drop legacy rows that predate per-owner scoping (no owner): they belong to
    // no account, so they'd be unmanageable yet still publicly readable/payable
    // by table number. Purging them on read keeps every table owned + isolated.
    tables: (s.tables ?? [])
      .filter((t) => typeof t.owner === "string" && t.owner !== "")
      .map((t) => {
        const items = Array.isArray(t.items) ? t.items : [];
        const pq = Array.isArray(t.paidQty) ? t.paidQty : [];
        return {
          ...t,
          owner: t.owner as string,
          // Backfill a capability token for tables created before tokens existed.
          token: typeof t.token === "string" && t.token ? t.token : newToken(),
          items,
          paid: typeof t.paid === "number" ? t.paid : 0,
          // Coerce paidQty to match items length (0 for new indices).
          paidQty: items.map((_, i) => (typeof pq[i] === "number" ? pq[i] : 0)),
          reservations: Array.isArray(t.reservations) ? t.reservations : [],
        };
      }),
    transactions: (s.transactions ?? []).filter(
      (tx) => typeof tx.owner === "string" && tx.owner !== "",
    ),
    // Legacy single global menu (s.menu) can't be attributed to one owner, so it
    // is not migrated — admins re-upload into their own per-owner slot.
    menus:
      s.menus && typeof s.menus === "object" && !Array.isArray(s.menus)
        ? s.menus
        : {},
    users: Array.isArray(s.users) ? s.users : [],
    loginAttempts:
      s.loginAttempts && typeof s.loginAttempts === "object"
        ? s.loginAttempts
        : {},
    // seq must never go below the highest existing table number, or createTable
    // could mint a colliding num after a legacy/seed reset.
    seq: Math.max(
      typeof s.seq === "number" ? s.seq : 0,
      ...(s.tables ?? []).map((t) => Number(t.num) || 0),
      0,
    ),
    version: typeof s.version === "number" ? s.version : 0,
  };
}

// Inject the super account if it's missing (first boot, or a store seeded
// before users existed). Mutates `s` in place; returns true if it added one.
// Persisting is the caller's job (done in readStore, without bumping version —
// same pattern as the legacy version backfill).
async function ensureSuperadmin(s: Store): Promise<boolean> {
  if (s.users.some((u) => u.role === "super")) return false;
  // Fail closed: never seed the master account from the source-committed
  // defaults in production — require the credentials to come from the env.
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
  });
  return true;
}

// Normalize + guarantee the super account exists, persisting (without bumping
// the version) only when a backfill actually changed the blob. `legacy` forces
// a write for the one-time version backfill on pre-CAS rows.
async function finalize(raw: Store, legacy: boolean): Promise<Store> {
  const s = normalize(raw);
  const addedSuper = await ensureSuperadmin(s);
  if (legacy || addedSuper) {
    // Persist the backfill through the version CAS (not an unconditional write)
    // so a read-path migration can never clobber a payment another instance
    // committed concurrently — a lost CAS just means someone else already
    // persisted a newer store, and our in-memory copy is still fine to return.
    const expected = s.version ?? 0;
    await commit(s, expected).catch(() => {});
  }
  return s;
}

async function readStore(): Promise<Store> {
  if (useSupabase) {
    const client = await sb();
    const { data, error } = await client
      .from(SB_TABLE)
      .select("value")
      .eq("key", KV_KEY)
      .maybeSingle();
    // A read error (missing `store` table, bad key, network) must NOT fall
    // through to seeding — that would overwrite live data with demo defaults on
    // every blip. Surface it so the misconfiguration is visible.
    if (error) {
      throw new Error(`store: Supabase read failed — ${error.message}`);
    }
    if (data?.value) {
      const raw = data.value as Store;
      // Legacy rows (written before optimistic concurrency) lack a version;
      // backfill it so the CAS in commit() can match.
      return finalize(raw, typeof raw.version !== "number");
    }
    const fresh = await finalize(seed(), false);
    return fresh;
  }
  if (useKv) {
    const { kv } = await import("@vercel/kv");
    const s = await kv.get<Store>(KV_KEY);
    if (s) return finalize(s, false);
    return finalize(seed(), false);
  }
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    return finalize(JSON.parse(raw) as Store, false);
  } catch {
    return finalize(seed(), false);
  }
}

async function writeStore(s: Store): Promise<void> {
  if (useSupabase) {
    const client = await sb();
    const { error } = await client
      .from(SB_TABLE)
      .upsert({ key: KV_KEY, value: s }, { onConflict: "key" });
    // A swallowed write error is exactly what made prod look like it "forgot"
    // every payment (table missing / RLS / bad key). Throw so the API returns
    // 500 and the client can retry instead of silently losing the update.
    if (error) {
      throw new Error(`store: Supabase write failed — ${error.message}`);
    }
    return;
  }
  if (useKv) {
    const { kv } = await import("@vercel/kv");
    await kv.set(KV_KEY, s);
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(s, null, 2), "utf8");
}

// ---------------------------------------------------------------------------
// Concurrency control
//
// The store is a single blob with read-modify-write semantics, so two
// concurrent mutations (e.g. a phone heartbeating while another pays) can read
// the same snapshot and clobber each other → lost update. We defend in two
// layers:
//   1. An in-process async lock serializes mutations within one Node instance
//      (covers disk/KV and same-instance Supabase requests).
//   2. Optimistic concurrency (a `version` stamped in the blob) makes Supabase
//      writes a compare-and-swap, so cross-instance serverless requests can't
//      clobber either — a stale write is rejected and the mutation retried.
// ---------------------------------------------------------------------------

const MAX_RETRIES = 6;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Promise-chain mutex: each mutation waits for the previous to settle.
let lock: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(fn, fn);
  lock = run.then(
    () => {},
    () => {},
  );
  return run;
}

/** Read the currently-stored Supabase version (0 if missing/unset). */
async function sbCurrentVersion(): Promise<number> {
  const client = await sb();
  const { data } = await client
    .from(SB_TABLE)
    .select("value")
    .eq("key", KV_KEY)
    .maybeSingle();
  const v = (data?.value as Store | undefined)?.version;
  return typeof v === "number" ? v : 0;
}

/**
 * Commit a mutated store, guarding against lost updates.
 *
 * On Supabase this attempts a conditional UPDATE matching the version we read.
 * Returns false ONLY when we can prove another writer won the race (caller
 * re-reads and retries). Crucially it is fail-SAFE: if the conditional write
 * errors or matches no row for any reason OTHER than a confirmed version
 * advance (e.g. a PostgREST jsonb-filter quirk), it degrades to an
 * unconditional write so a payment can never be permanently blocked — worst
 * case we fall back to last-write-wins, never a hard failure.
 *
 * Disk/KV writes are unconditional — the in-process lock already serializes
 * them within the single process.
 */
async function commit(s: Store, expected: number): Promise<boolean> {
  s.version = expected + 1;
  if (useSupabase) {
    const client = await sb();
    try {
      const { data, error } = await client
        .from(SB_TABLE)
        .update({ value: s })
        .eq("key", KV_KEY)
        .eq("value->>version", String(expected))
        .select("key");
      if (!error && (data?.length ?? 0) > 0) return true; // CAS won

      // No row updated (or the filter errored). Disambiguate: did the stored
      // version actually move past ours (real conflict) or did the conditional
      // simply not apply? Only a confirmed advance means "retry".
      const current = await sbCurrentVersion();
      if (current !== expected) return false; // real concurrent write → retry
    } catch {
      // Conditional path unusable on this backend — fall through to a plain
      // write rather than failing the request.
    }
    await writeStore(s); // unconditional upsert (value already carries version)
    return true;
  }
  await writeStore(s);
  return true;
}

/**
 * Read-modify-write with serialization + optimistic-concurrency retry. `apply`
 * mutates the fresh store in place and returns the caller's result plus whether
 * a write is needed (skip writes for not-found / no-op so we don't bump the
 * version pointlessly). `apply` may run more than once, so it must be a pure
 * function of the store it's handed.
 */
async function mutate<T>(
  apply: (s: Store) => { result: T; write: boolean },
): Promise<T> {
  return withLock(async () => {
    for (let attempt = 0; ; attempt++) {
      const s = await readStore();
      const expected = s.version ?? 0;
      const { result, write } = apply(s);
      if (!write) return result;
      if (await commit(s, expected)) return result;
      if (attempt >= MAX_RETRIES) {
        throw new Error("store: write conflict (max retries exceeded)");
      }
      await sleep(15 * (attempt + 1));
    }
  });
}

/** Tables owned by one admin (dashboards are strictly per-owner). */
export async function listTables(owner: string): Promise<LiveTable[]> {
  return (await readStore()).tables.filter((t) => t.owner === owner);
}

export async function createTable(owner: string): Promise<LiveTable> {
  return mutate((s) => {
    // Allocate from a monotonic counter so a freed (deleted) number is never
    // reused — a stale customer QR can't resolve to a different table later.
    // Numbers stay globally unique; each admin only ever sees its own tables.
    s.seq = Math.max(
      s.seq ?? 0,
      ...s.tables.map((t) => Number(t.num) || 0),
      0,
    ) + 1;
    const table: LiveTable = {
      num: String(s.seq),
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
  const s = await readStore();
  return s.tables.find((x) => x.num === num) ?? null;
}

export async function setTableItems(
  num: string,
  items: OrderItem[],
  owner: string,
): Promise<LiveTable | null> {
  return mutate((s) => {
    const t = s.tables.find((x) => x.num === num && x.owner === owner);
    if (!t) return { result: null, write: false };
    t.items = items;
    t.amount = orderAmount(items);
    // Editing the order resets per-item payment locks and any live holds — and
    // the carried `paid` principal, which referred to the OLD order. Leaving it
    // would credit stale dollars against the new bill (wrong remaining, no unit
    // locked).
    t.paidQty = zeros(items.length);
    t.reservations = [];
    t.paid = 0;
    if (items.length === 0) {
      t.status = "open";
    } else {
      t.status = "unpaid";
    }
    return { result: t, write: true };
  });
}

/** Upsert a phone's live item hold (heartbeat) and prune abandoned holds. */
export async function syncReservation(
  num: string,
  id: string,
  qty: number[],
  token: string,
): Promise<LiveTable | null> {
  return mutate((s) => {
    const t = s.tables.find((x) => x.num === num);
    // Require the table's capability token — a guessable num alone can't touch it.
    if (!t || t.token !== token) return { result: null, write: false };
    const others = pruneReservations(t.reservations).filter((r) => r.id !== id);
    // Clamp each hold to the units actually orderable (0..ordered-qty). Without
    // this, one phone could POST qty:[9999,…] and drive every item's
    // availability to 0, blocking per-item payment for everyone else.
    const mine = t.items.map((it, i) => {
      const n = qty?.[i];
      return typeof n === "number" && n > 0
        ? Math.min(Math.floor(n), it.qty)
        : 0;
    });
    t.reservations = mine.some((n) => n > 0)
      ? [...others, { id, qty: mine, ts: Date.now() }]
      : others;
    return { result: t, write: true };
  });
}

/**
 * Record a mock payment. Clamps to the remaining balance (no overpay), locks
 * paid item units, and clears the caller's live hold. Auto-sets status.
 */
export async function payTable(
  num: string,
  amount: number,
  opts: { id?: string; items?: number[]; method?: string; token: string },
): Promise<LiveTable | null> {
  return mutate((s) => {
    const t = s.tables.find((x) => x.num === num);
    // Require the table's capability token (a guessable num can't pay any table).
    if (!t || t.token !== opts.token) return { result: null, write: false };
    if (t.items.length === 0) return { result: t, write: false };

    const due = billDue(t.items);
    const remaining = Math.max(0, +(due - (t.paid ?? 0)).toFixed(2));
    const applied = Math.min(Math.max(0, amount), remaining);
    t.paid = +(((t.paid ?? 0) + applied).toFixed(2));

    // Lock paid item units — but only as many as the APPLIED money actually
    // covers. If the payment was clamped (another phone paid first, so
    // remaining < the selected items' value), we must not mark items Paid that
    // this payment didn't fully cover. Spend `applied` across the requested
    // units at their tax-inclusive unit price; lock a unit only once paid.
    if (opts?.items) {
      if (!Array.isArray(t.paidQty) || t.paidQty.length !== t.items.length) {
        t.paidQty = zeros(t.items.length);
      }
      let budget = applied;
      t.items.forEach((it, i) => {
        const want = Math.min(
          Math.max(0, Math.floor(opts.items![i] ?? 0)),
          it.qty - t.paidQty[i],
        );
        if (want <= 0 || it.qty <= 0) return;
        const unit = it.price / it.qty;
        // Lock the largest k (≤want) whose CUMULATIVE tax-inclusive cost fits the
        // budget. Rounding the cumulative cost once (not per unit) mirrors
        // billDue's round-once math, so per-unit drift can't leave an
        // exactly-paid line's last unit unlocked. 1¢ tolerance absorbs the final
        // rounding.
        let lock = 0;
        for (let k = 1; k <= want; k++) {
          if (+(unit * k * 1.08).toFixed(2) <= budget + 0.01) lock = k;
          else break;
        }
        if (lock > 0) {
          budget = +(budget - +(unit * lock * 1.08).toFixed(2)).toFixed(2);
          t.paidQty[i] += lock;
        }
      });
    }

    // Drop the caller's hold + any stale holds.
    t.reservations = pruneReservations(t.reservations).filter(
      (r) => r.id !== opts?.id,
    );

    // Record the payment in the live ledger (powers the dashboard + CSV export).
    if (applied > 0) {
      s.transactions.unshift({
        time: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
        table: num,
        amount: fmt(applied),
        method: opts?.method || "Card",
        // Receipts are scoped to the table's owner so each admin's ledger is
        // independent — a customer paying never crosses accounts.
        owner: t.owner,
      });
    }

    if (t.paid + 0.01 >= due) t.status = "cleared";
    else if (t.paid > 0) t.status = "partial";
    return { result: t, write: true };
  });
}

export async function setTableStatus(
  num: string,
  status: TableStatus,
  owner: string,
): Promise<LiveTable | null> {
  return mutate((s) => {
    const t = s.tables.find((x) => x.num === num && x.owner === owner);
    if (!t) return { result: null, write: false };
    t.status = status;
    if (status === "open") t.amount = "—";
    else if (t.amount === "—") t.amount = "$0";
    return { result: t, write: true };
  });
}

export async function deleteTable(
  num: string,
  owner: string,
): Promise<boolean> {
  return mutate((s) => {
    const before = s.tables.length;
    s.tables = s.tables.filter((x) => !(x.num === num && x.owner === owner));
    if (s.tables.length === before) return { result: false, write: false };
    return { result: true, write: true };
  });
}

/** Receipts for one admin (ledger is strictly per-owner). */
export async function listTransactions(owner: string): Promise<Transaction[]> {
  return (await readStore()).transactions.filter((t) => t.owner === owner);
}

// ---------------------------------------------------------------------------
// User accounts (login)
// ---------------------------------------------------------------------------

/** Public (non-secret) view of an account — never exposes the password hash. */
export interface PublicUser {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}

const publicUser = (u: AdminUser): PublicUser => ({
  id: u.id,
  email: u.email,
  role: u.role,
  createdAt: u.createdAt,
});

/** Full account record (incl. hash) for an email — for login verification. */
export async function findUserByEmail(
  email: string,
): Promise<AdminUser | null> {
  const norm = email.trim().toLowerCase();
  const s = await readStore();
  return s.users.find((u) => u.email === norm) ?? null;
}

export async function getUserById(id: string): Promise<AdminUser | null> {
  const s = await readStore();
  return s.users.find((u) => u.id === id) ?? null;
}

/**
 * Resolve the live account behind a request's session, or null. Re-validates
 * against the store on every call, so a deleted/role-changed account loses
 * access immediately (stateless tokens otherwise stay valid until expiry).
 */
export async function authedUser(req: Request): Promise<AdminUser | null> {
  const session = await getSession(req);
  if (!session) return null;
  const u = await getUserById(session.sub);
  return u && u.role === session.role ? u : null;
}

// ---------------------------------------------------------------------------
// Login throttling (brute-force / credential-stuffing defense)
// ---------------------------------------------------------------------------

const LOGIN_MAX_FAILS = 8; // consecutive fails within the window before lockout
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

/** True if this `email|ip` key is currently locked out. */
export async function isLoginLocked(key: string): Promise<boolean> {
  const a = (await readStore()).loginAttempts[key];
  return !!a && a.lockedUntil > Date.now();
}

/** Record a failed login; locks the key once it exceeds the threshold. */
export async function recordLoginFailure(key: string): Promise<void> {
  await mutate((s) => {
    const now = Date.now();
    // Opportunistically prune stale entries so the map can't grow unbounded.
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

/** Clear the failure counter for a key after a successful login. */
export async function clearLoginFailures(key: string): Promise<void> {
  await mutate((s) => {
    if (!s.loginAttempts[key]) return { result: undefined, write: false };
    delete s.loginAttempts[key];
    return { result: undefined, write: true };
  });
}

/** Admin accounts (super excluded) — for the super console. */
export async function listAdmins(): Promise<PublicUser[]> {
  const s = await readStore();
  return s.users.filter((u) => u.role === "admin").map(publicUser);
}

/**
 * Create an admin account. Email must be unique (case-insensitive). Returns the
 * new public user, or null if the email is already taken.
 */
export async function createAdmin(
  email: string,
  passwordHash: string,
): Promise<PublicUser | null> {
  const norm = email.trim().toLowerCase();
  return mutate((s) => {
    if (s.users.some((u) => u.email === norm)) {
      return { result: null, write: false };
    }
    const user: AdminUser = {
      id: globalThis.crypto.randomUUID(),
      email: norm,
      passwordHash,
      role: "admin",
      createdAt: new Date().toISOString(),
    };
    s.users.push(user);
    return { result: publicUser(user), write: true };
  });
}

/**
 * Delete an admin account and cascade-remove its tables + receipts so no
 * orphaned, inaccessible data is left behind. The super account can't be
 * deleted. Returns false if no such admin existed.
 */
export async function deleteAdmin(id: string): Promise<boolean> {
  return mutate((s) => {
    const u = s.users.find((x) => x.id === id);
    if (!u || u.role !== "admin") return { result: false, write: false };
    s.users = s.users.filter((x) => x.id !== id);
    s.tables = s.tables.filter((t) => t.owner !== id);
    s.transactions = s.transactions.filter((t) => t.owner !== id);
    return { result: true, write: true };
  });
}

/** One admin's own menu (for the admin menu page). */
export async function getMenu(owner: string): Promise<MenuMeta | null> {
  return (await readStore()).menus[owner] ?? null;
}

/** The menu a customer should see for a scanned table = its owner's menu. */
export async function getMenuForTable(num: string): Promise<MenuMeta | null> {
  const s = await readStore();
  const t = s.tables.find((x) => x.num === num);
  return t ? s.menus[t.owner] ?? null : null;
}

export async function setMenu(owner: string, meta: MenuMeta): Promise<void> {
  await mutate((s) => {
    s.menus[owner] = meta;
    return { result: undefined, write: true };
  });
}

export async function clearMenu(owner: string): Promise<void> {
  await mutate((s) => {
    delete s.menus[owner];
    return { result: undefined, write: true };
  });
}
