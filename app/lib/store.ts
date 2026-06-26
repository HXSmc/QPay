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
    if (data?.value) return normalize(data.value as Store);
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

export async function listTables(): Promise<LiveTable[]> {
  return (await readStore()).tables;
}

export async function createTable(): Promise<LiveTable> {
  const s = await readStore();
  const maxNum = s.tables.reduce((m, t) => Math.max(m, Number(t.num) || 0), 0);
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
  await writeStore(s);
  return table;
}

export async function getTable(num: string): Promise<LiveTable | null> {
  const s = await readStore();
  return s.tables.find((x) => x.num === num) ?? null;
}

export async function setTableItems(
  num: string,
  items: OrderItem[],
): Promise<LiveTable | null> {
  const s = await readStore();
  const t = s.tables.find((x) => x.num === num);
  if (!t) return null;
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
  await writeStore(s);
  return t;
}

/** Upsert a phone's live item hold (heartbeat) and prune abandoned holds. */
export async function syncReservation(
  num: string,
  id: string,
  qty: number[],
): Promise<LiveTable | null> {
  const s = await readStore();
  const t = s.tables.find((x) => x.num === num);
  if (!t) return null;
  const others = pruneReservations(t.reservations).filter((r) => r.id !== id);
  const mine = (qty ?? []).map((n) => (typeof n === "number" && n > 0 ? n : 0));
  t.reservations = mine.some((n) => n > 0)
    ? [...others, { id, qty: mine, ts: Date.now() }]
    : others;
  await writeStore(s);
  return t;
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
  const s = await readStore();
  const t = s.tables.find((x) => x.num === num);
  if (!t) return null;

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
  await writeStore(s);
  return t;
}

export async function setTableStatus(
  num: string,
  status: TableStatus,
): Promise<LiveTable | null> {
  const s = await readStore();
  const t = s.tables.find((x) => x.num === num);
  if (!t) return null;
  t.status = status;
  if (status === "open") t.amount = "—";
  else if (t.amount === "—") t.amount = "$0";
  await writeStore(s);
  return t;
}

export async function deleteTable(num: string): Promise<boolean> {
  const s = await readStore();
  const before = s.tables.length;
  s.tables = s.tables.filter((x) => x.num !== num);
  if (s.tables.length === before) return false;
  await writeStore(s);
  return true;
}

export async function listTransactions(): Promise<Transaction[]> {
  return (await readStore()).transactions;
}

export async function getMenu(): Promise<MenuMeta | null> {
  return (await readStore()).menu;
}

export async function setMenu(meta: MenuMeta): Promise<void> {
  const s = await readStore();
  s.menu = meta;
  await writeStore(s);
}

export async function clearMenu(): Promise<void> {
  const s = await readStore();
  s.menu = null;
  await writeStore(s);
}
