import type { LiveTable, OrderItem, TableStatus, Transaction } from "./types";

export const BRAND = "#2E5BFF";

/** Format a number as a USD currency string, e.g. 12.5 -> "$12.50". */
export const fmt = (n: number) => "$" + n.toFixed(2);

/** Bill owed for an order: subtotal + 8% tax (tip excluded — it varies per payer). */
export const billDue = (items: OrderItem[]) =>
  +(items.reduce((a, it) => a + it.price, 0) * 1.08).toFixed(2);

/** Items on the bill. Truffle Burger and Sparkling Water are multi-quantity. */
export const ITEMS: OrderItem[] = [
  { name: "Truffle Burger", qty: 2, price: 36.0 },
  { name: "Caesar Salad", qty: 1, price: 12.5 },
  { name: "Sparkling Water", qty: 2, price: 7.0 },
  { name: "Margherita Pizza", qty: 1, price: 16.0 },
  { name: "Tiramisu", qty: 1, price: 9.5 },
];

export const SUBTOTAL = 81.0;
export const TAX = +(SUBTOTAL * 0.08).toFixed(2);

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
  partial: { c: "#F59E0B", bg: "#FFFBEB", label: "Partial" },
  cleared: { c: "#16A34A", bg: "#F0FDF4", label: "Cleared" },
  open: { c: "#94A3B8", bg: "#F8FAFC", label: "Open" },
};

export const TABLES: Omit<
  LiveTable,
  "owner" | "token" | "items" | "paid" | "paidQty" | "reservations"
>[] = [
  { num: "1", status: "open", amount: "—" },
  { num: "2", status: "open", amount: "—" },
  { num: "3", status: "open", amount: "—" },
  { num: "4", status: "open", amount: "—" },
  { num: "5", status: "open", amount: "—" },
  { num: "6", status: "open", amount: "—" },
  { num: "7", status: "open", amount: "—" },
  { num: "8", status: "open", amount: "—" },
  { num: "9", status: "open", amount: "—" },
  { num: "10", status: "open", amount: "—" },
  { num: "11", status: "open", amount: "—" },
  { num: "12", status: "open", amount: "—" },
];

export const METHOD_COLOR: Record<string, { c: string; bg: string }> = {
  "Apple Pay": { c: "#0B1221", bg: "#F1F5F9" },
  "Google Pay": { c: "#2E5BFF", bg: "#EEF2FF" },
  "Visa •4242": { c: "#475569", bg: "#F1F5F9" },
  Mastercard: { c: "#475569", bg: "#F1F5F9" },
};

export const TRANSACTIONS: Omit<Transaction, "owner">[] = [
  { time: "8:41 PM", table: "4", amount: "$56.00", method: "Apple Pay" },
  { time: "8:36 PM", table: "7", amount: "$77.49", method: "Google Pay" },
  { time: "8:29 PM", table: "1", amount: "$124.20", method: "Visa •4242" },
  { time: "8:22 PM", table: "10", amount: "$94.10", method: "Apple Pay" },
  { time: "8:15 PM", table: "2", amount: "$88.00", method: "Mastercard" },
  { time: "8:04 PM", table: "6", amount: "$143.75", method: "Google Pay" },
];
