import type { OrderItem, TableStatus } from "./types";

export const BRAND = "#2E5BFF";

/** Default tax rate (percent) when a restaurant hasn't set its own. */
export const DEFAULT_TAX_RATE = 8;

/** Format a number as a USD currency string, e.g. 12.5 -> "$12.50". */
export const fmt = (n: number) => "$" + n.toFixed(2);

/**
 * Bill owed for an order: subtotal + tax (tip excluded — it varies per payer).
 * `taxRate` is a percent (default 8%); restaurants can configure their own.
 */
export const billDue = (items: OrderItem[], taxRate: number = DEFAULT_TAX_RATE) =>
  +(items.reduce((a, it) => a + it.price, 0) * (1 + taxRate / 100)).toFixed(2);

export const TIP_PCT: Record<string, number> = {
  "0": 0,
  "10": 0.1,
  "15": 0.15,
  "20": 0.2,
};

export const STATUS_PALETTE: Record<
  TableStatus,
  { c: string; bg: string; label: string }
> = {
  unpaid: { c: "#DC2626", bg: "#FEF2F2", label: "Unpaid" },
  partial: { c: "#B45309", bg: "#FFFBEB", label: "Partial" },
  cleared: { c: "#15803D", bg: "#F0FDF4", label: "Cleared" },
  open: { c: "#94A3B8", bg: "#F8FAFC", label: "Open" },
};

export const METHOD_COLOR: Record<string, { c: string; bg: string }> = {
  "Apple Pay": { c: "#0B1221", bg: "#F1F5F9" },
  "Google Pay": { c: "#2E5BFF", bg: "#EEF2FF" },
  "Visa •4242": { c: "#475569", bg: "#F1F5F9" },
  Mastercard: { c: "#475569", bg: "#F1F5F9" },
};
