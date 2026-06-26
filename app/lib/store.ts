import { promises as fs } from "fs";
import path from "path";
import { billDue, fmt, ITEMS, TABLES, TRANSACTIONS } from "./data";
import type {
  LiveTable,
  MenuMeta,
  OrderItem,
  Reservation,
  Store,
  TableStatus,
  Transaction,
} from "./types";

function orderAmount(items: OrderItem[]): string {
  if (!items.length) return "—";
  return fmt(items.reduce((a, it) => a + it.price, 0));
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

// Lazily-created, memoized Supabase client (dynamic import so the dep isn't
// bundled when running in disk/KV mode).
let _sb: import("@supabase/supabase-js").SupabaseClient | undefined;
async function sb() {
  if (!_sb) {
    const { createClient } = await import("@supabase/supabase-js");
    _sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
  }
  return _sb;
}

function seed(): Store {
  return {
    tables: TABLES.map((t) => {
      if (t.num === "12") {
        const items = ITEMS.map((i) => ({ ...i }));
        return {
          ...t,
          items,
          status: "unpaid" as TableStatus,
          amount: orderAmount(items),
          paid: 0,
          paidQty: zeros(items.length),
          reservations: [],
        };
      }
      return { ...t, items: [], paid: 0, paidQty: [], reservations: [] };
    }),
    transactions: TRANSACTIONS.map((t) => ({ ...t })),
    menu: null,
    version: 0,
  };
}

// Backfill fields added after a store was first written (e.g. table.items),
// so stores created by older versions don't crash newer code.
function normalize(s: Store): Store {
  return {
    tables: (s.tables ?? []).map((t) => {
      const items = Array.isArray(t.items) ? t.items : [];
      const pq = Array.isArray(t.paidQty) ? t.paidQty : [];
      return {
        ...t,
        items,
        paid: typeof t.paid === "number" ? t.paid : 0,
        // Coerce paidQty to match items length (defaults to 0 for new indices).
        paidQty: items.map((_, i) => (typeof pq[i] === "number" ? pq[i] : 0)),
        reservations: Array.isArray(t.reservations) ? t.reservations : [],
      };
    }),
    transactions: s.transactions ?? [],
    menu: s.menu ?? null,
    version: typeof s.version === "number" ? s.version : 0,
  };
}

async function readStore(): Promise<Store> {
  if (useSupabase) {
    const client = await sb();
    const { data } = await client
      .from(SB_TABLE)
      .select("value")
      .eq("key", KV_KEY)
      .maybeSingle();
    if (data?.value) {
      const raw = data.value as Store;
      const norm = normalize(raw);
      // One-time backfill: persist a version on legacy rows written before
      // optimistic concurrency existed, so the CAS in commit() can match it.
      if (typeof raw.version !== "number") await writeStore(norm);
      return norm;
    }
    const fresh = seed();
    await writeStore(fresh);
    return fresh;
  }
  if (useKv) {
    const { kv } = await import("@vercel/kv");
    const s = await kv.get<Store>(KV_KEY);
    if (s) return normalize(s);
    const fresh = seed();
    await kv.set(KV_KEY, fresh);
    return fresh;
  }
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    return normalize(JSON.parse(raw) as Store);
  } catch {
    const s = seed();
    await writeStore(s);
    return s;
  }
}

async function writeStore(s: Store): Promise<void> {
  if (useSupabase) {
    const client = await sb();
    await client
      .from(SB_TABLE)
      .upsert({ key: KV_KEY, value: s }, { onConflict: "key" });
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

export async function listTables(): Promise<LiveTable[]> {
  return (await readStore()).tables;
}

export async function createTable(): Promise<LiveTable> {
  return mutate((s) => {
    const maxNum = s.tables.reduce(
      (m, t) => Math.max(m, Number(t.num) || 0),
      0,
    );
    const table: LiveTable = {
      num: String(maxNum + 1),
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
): Promise<LiveTable | null> {
  return mutate((s) => {
    const t = s.tables.find((x) => x.num === num);
    if (!t) return { result: null, write: false };
    t.items = items;
    t.amount = orderAmount(items);
    // Editing the order resets per-item payment locks and any live holds.
    t.paidQty = zeros(items.length);
    t.reservations = [];
    if (items.length === 0) {
      t.status = "open";
      t.paid = 0;
    } else if (t.status === "open") {
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
): Promise<LiveTable | null> {
  return mutate((s) => {
    const t = s.tables.find((x) => x.num === num);
    if (!t) return { result: null, write: false };
    const others = pruneReservations(t.reservations).filter((r) => r.id !== id);
    const mine = (qty ?? []).map((n) =>
      typeof n === "number" && n > 0 ? n : 0,
    );
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
  opts?: { id?: string; items?: number[] },
): Promise<LiveTable | null> {
  return mutate((s) => {
    const t = s.tables.find((x) => x.num === num);
    if (!t || t.items.length === 0) return { result: t ?? null, write: false };

    const due = billDue(t.items);
    const remaining = Math.max(0, +(due - (t.paid ?? 0)).toFixed(2));
    const applied = Math.min(Math.max(0, amount), remaining);
    t.paid = +(((t.paid ?? 0) + applied).toFixed(2));

    // Lock paid item units (capped at ordered qty).
    if (opts?.items) {
      if (!Array.isArray(t.paidQty) || t.paidQty.length !== t.items.length) {
        t.paidQty = zeros(t.items.length);
      }
      t.items.forEach((it, i) => {
        const add = typeof opts.items![i] === "number" ? opts.items![i] : 0;
        t.paidQty[i] = Math.min(t.paidQty[i] + Math.max(0, add), it.qty);
      });
    }

    // Drop the caller's hold + any stale holds.
    t.reservations = pruneReservations(t.reservations).filter(
      (r) => r.id !== opts?.id,
    );

    if (t.paid + 0.01 >= due) t.status = "cleared";
    else if (t.paid > 0) t.status = "partial";
    return { result: t, write: true };
  });
}

export async function setTableStatus(
  num: string,
  status: TableStatus,
): Promise<LiveTable | null> {
  return mutate((s) => {
    const t = s.tables.find((x) => x.num === num);
    if (!t) return { result: null, write: false };
    t.status = status;
    if (status === "open") t.amount = "—";
    else if (t.amount === "—") t.amount = "$0";
    return { result: t, write: true };
  });
}

export async function deleteTable(num: string): Promise<boolean> {
  return mutate((s) => {
    const before = s.tables.length;
    s.tables = s.tables.filter((x) => x.num !== num);
    if (s.tables.length === before) return { result: false, write: false };
    return { result: true, write: true };
  });
}

export async function listTransactions(): Promise<Transaction[]> {
  return (await readStore()).transactions;
}

export async function getMenu(): Promise<MenuMeta | null> {
  return (await readStore()).menu;
}

export async function setMenu(meta: MenuMeta): Promise<void> {
  await mutate((s) => {
    s.menu = meta;
    return { result: undefined, write: true };
  });
}

export async function clearMenu(): Promise<void> {
  await mutate((s) => {
    s.menu = null;
    return { result: undefined, write: true };
  });
}
