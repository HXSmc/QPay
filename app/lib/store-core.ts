// Pure domain helpers shared by both store backends (relational Supabase and the
// disk/KV blob fallback). Keeping the payment-locking math in ONE place means the
// two persistence layers can never drift on money. Nothing here touches I/O.

import { billDue, DEFAULT_TAX_RATE, fmt } from "./data";
import type {
  LiveTable,
  OrderItem,
  Reservation,
  RestaurantSettings,
  TableStatus,
  Transaction,
} from "./types";

export const newToken = (): string => globalThis.crypto.randomUUID();

export const zeros = (n: number): number[] =>
  Array.from({ length: n }, () => 0);

/** Reservations older than this (ms) are considered abandoned and dropped. */
export const RESV_TTL_MS = 8000;

export function pruneReservations(rs: Reservation[]): Reservation[] {
  const cutoff = Date.now() - RESV_TTL_MS;
  return (rs ?? []).filter((r) => r.ts >= cutoff && r.qty.some((q) => q > 0));
}

/** Coerce a possibly-partial settings record to a complete one with defaults. */
export function coerceSettings(
  v: Partial<RestaurantSettings> | undefined | null,
): RestaurantSettings {
  return {
    name: typeof v?.name === "string" ? v.name : "",
    taxRate: typeof v?.taxRate === "number" ? v.taxRate : DEFAULT_TAX_RATE,
    autoReceipts: v?.autoReceipts ?? true,
    tipPrompts: v?.tipPrompts ?? true,
  };
}

/** Validate + clamp a settings patch against the current value. */
export function mergeSettings(
  cur: RestaurantSettings,
  patch: Partial<RestaurantSettings>,
): RestaurantSettings {
  return {
    name:
      typeof patch.name === "string"
        ? patch.name.trim().slice(0, 80)
        : cur.name,
    taxRate:
      typeof patch.taxRate === "number" &&
      isFinite(patch.taxRate) &&
      patch.taxRate >= 0 &&
      patch.taxRate <= 30
        ? patch.taxRate
        : cur.taxRate,
    autoReceipts:
      typeof patch.autoReceipts === "boolean"
        ? patch.autoReceipts
        : cur.autoReceipts,
    tipPrompts:
      typeof patch.tipPrompts === "boolean" ? patch.tipPrompts : cur.tipPrompts,
  };
}

export function orderAmount(items: OrderItem[], taxRate: number): string {
  if (!items.length) return "—";
  // Show the actual bill (subtotal + tax) so the admin "amount" matches what
  // `paid` and the customer's total are measured against.
  return fmt(billDue(items, taxRate));
}

/**
 * Apply a mock payment to a table IN PLACE, using the owner's tax rate. Clamps
 * to the remaining balance (no overpay), locks paid item units, clears the
 * caller's live hold, and sets status. Returns the applied amount + the ledger
 * transaction to record (null if nothing was applied). The caller persists.
 *
 * This is the single source of truth for payment math — both store backends call
 * it so disk and relational agree to the cent.
 */
export function applyPayment(
  t: LiveTable,
  amount: number,
  opts: { id?: string; items?: number[]; method?: string },
  taxRate: number,
): { applied: number; txn: Transaction | null } {
  if (t.items.length === 0) return { applied: 0, txn: null };

  const taxMul = 1 + taxRate / 100;
  const due = billDue(t.items, taxRate);
  const remaining = Math.max(0, +(due - (t.paid ?? 0)).toFixed(2));
  const applied = Math.min(Math.max(0, amount), remaining);
  t.paid = +((t.paid ?? 0) + applied).toFixed(2);

  // Lock paid item units — but only as many as the APPLIED money actually
  // covers. Spend `applied` across the requested units at their tax-inclusive
  // unit price; lock a unit only once paid.
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
      // budget. Round the cumulative cost once (mirrors billDue) so per-unit
      // drift can't leave an exactly-paid line's last unit unlocked. 1¢ tolerance
      // absorbs the final rounding.
      let lock = 0;
      for (let k = 1; k <= want; k++) {
        if (+(unit * k * taxMul).toFixed(2) <= budget + 0.01) lock = k;
        else break;
      }
      if (lock > 0) {
        budget = +(budget - +(unit * lock * taxMul).toFixed(2)).toFixed(2);
        t.paidQty[i] += lock;
      }
    });
  }

  // Drop the caller's hold + any stale holds.
  t.reservations = pruneReservations(t.reservations).filter(
    (r) => r.id !== opts?.id,
  );

  let txn: Transaction | null = null;
  if (applied > 0) {
    txn = {
      time: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      table: t.num,
      amount: fmt(applied),
      method: opts?.method || "Card",
      owner: t.owner,
    };
  }

  if (t.paid + 0.01 >= due) t.status = "cleared";
  else if (t.paid > 0) t.status = "partial";
  return { applied, txn };
}

/** Compute the clamped reservation hold for one heartbeat (pure). */
export function clampHold(items: OrderItem[], qty: number[]): number[] {
  return items.map((it, i) => {
    const n = qty?.[i];
    return typeof n === "number" && n > 0 ? Math.min(Math.floor(n), it.qty) : 0;
  });
}

export function nextStatusForItems(items: OrderItem[]): TableStatus {
  return items.length === 0 ? "open" : "unpaid";
}

// --- In-app ordering --------------------------------------------------------

const MAX_ORDER_QTY = 50;
const MAX_COMMENT_LEN = 160;
const MAX_ORDER_LINES = 40;

/**
 * Build validated, price-snapshotted order lines from a customer request and the
 * owner's live items. Prices/names come from the SERVER's items map, never the
 * client — a diner can only choose item id, qty, and a note. Unknown ids and
 * non-positive quantities are dropped. Shared by both backends so they agree.
 */
export function buildOrderLines(
  available: { id: string; name: string; price: number }[],
  requested: { menuItemId?: string; qty?: number; comment?: string }[],
): { lines: OrderLineDraft[]; total: number } {
  const byId = new Map(available.map((it) => [it.id, it]));
  const lines: OrderLineDraft[] = [];
  for (const r of Array.isArray(requested) ? requested.slice(0, MAX_ORDER_LINES) : []) {
    const item = r.menuItemId ? byId.get(r.menuItemId) : undefined;
    const qty = Math.min(Math.max(0, Math.floor(Number(r.qty) || 0)), MAX_ORDER_QTY);
    if (!item || qty <= 0) continue;
    lines.push({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      qty,
      comment: typeof r.comment === "string" ? r.comment.trim().slice(0, MAX_COMMENT_LEN) : "",
    });
  }
  const total = +lines.reduce((a, l) => a + l.price * l.qty, 0).toFixed(2);
  return { lines, total };
}

export interface OrderLineDraft {
  menuItemId: string;
  name: string;
  price: number;
  qty: number;
  comment: string;
}
