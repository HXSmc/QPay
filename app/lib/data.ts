import type { OrderItem, TableStatus } from "./types";

export const BRAND = "#2E5BFF";

/** Default tax rate (percent) when a restaurant hasn't set its own. */
export const DEFAULT_TAX_RATE = 8;

/** Supported per-restaurant display currencies. */
export const CURRENCIES = ["USD", "GBP", "EUR", "SAR"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const DEFAULT_CURRENCY: Currency = "USD";

const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  SAR: "SAR ",
};

export function isCurrency(v: unknown): v is Currency {
  return typeof v === "string" && (CURRENCIES as readonly string[]).includes(v);
}

/** Bare currency symbol/prefix, e.g. currencySymbol("GBP") -> "£". */
export const currencySymbol = (currency: Currency = DEFAULT_CURRENCY) =>
  (CURRENCY_SYMBOL[currency] ?? "$").trim();

/** Format a number as a currency string, e.g. fmt(12.5,"GBP") -> "£12.50". */
export const fmt = (n: number, currency: Currency = DEFAULT_CURRENCY) =>
  (CURRENCY_SYMBOL[currency] ?? "$") + n.toFixed(2);

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
  // Aligned to the theme STATUS tokens (cool palette, single source of truth).
  unpaid: { c: "#C02B3A", bg: "#FCEBED", label: "Unpaid" },
  partial: { c: "#8A5A12", bg: "#FBF3E4", label: "Partial" },
  cleared: { c: "#15734F", bg: "#E7F4EE", label: "Cleared" },
  open: { c: "#3D4651", bg: "#EEF0F3", label: "Open" },
};

export const METHOD_COLOR: Record<string, { c: string; bg: string }> = {
  "Apple Pay": { c: "#0B1221", bg: "#F1F5F9" },
  "Google Pay": { c: "#2E5BFF", bg: "#EEF2FF" },
  "Visa •4242": { c: "#475569", bg: "#F1F5F9" },
  Mastercard: { c: "#475569", bg: "#F1F5F9" },
};
