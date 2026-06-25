import { promises as fs } from "fs";
import path from "path";
import { fmt, ITEMS, TABLES, TRANSACTIONS } from "./data";
import type {
  LiveTable,
  MenuMeta,
  OrderItem,
  Store,
  TableStatus,
  Transaction,
} from "./types";

function orderAmount(items: OrderItem[]): string {
  if (!items.length) return "—";
  return fmt(items.reduce((a, it) => a + it.price, 0));
}

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");
export const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const KV_KEY = "qpay:store";
// KV mode on Vercel (or Upstash); disk mode locally when the env is absent.
const useKv = !!process.env.KV_REST_API_URL;

function seed(): Store {
  return {
    tables: TABLES.map((t) => {
      if (t.num === "12") {
        const items = ITEMS.map((i) => ({ ...i }));
        return { ...t, items, status: "unpaid" as TableStatus, amount: orderAmount(items) };
      }
      return { ...t, items: [] };
    }),
    transactions: TRANSACTIONS.map((t) => ({ ...t })),
    menu: null,
  };
}

async function readStore(): Promise<Store> {
  if (useKv) {
    const { kv } = await import("@vercel/kv");
    const s = await kv.get<Store>(KV_KEY);
    if (s) return s;
    const fresh = seed();
    await kv.set(KV_KEY, fresh);
    return fresh;
  }
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    return JSON.parse(raw) as Store;
  } catch {
    const s = seed();
    await writeStore(s);
    return s;
  }
}

async function writeStore(s: Store): Promise<void> {
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
  if (items.length === 0) t.status = "open";
  else if (t.status === "open") t.status = "unpaid";
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
