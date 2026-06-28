export type SplitMode = "full" | "equal" | "item";
export type TipKey = "0" | "10" | "15" | "20" | "custom";

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

export type TableStatus = "unpaid" | "partial" | "cleared" | "open";

/** A phone's live, advisory hold on item units while it's choosing (pre-payment). */
export interface Reservation {
  /** Per-phone client id. */
  id: string;
  /** Units held per item, index-aligned to LiveTable.items. */
  qty: number[];
  /** Last heartbeat (ms epoch); stale reservations are pruned. */
  ts: number;
}

export interface LiveTable {
  num: string;
  /** Admin user id that owns this table. Tables are private to their owner. */
  owner: string;
  /**
   * Unguessable per-table capability. The customer QR URL carries it, and the
   * public (unauthenticated) read/pay/sync endpoints require a match — so a
   * sequential `num` can't be enumerated to read or tamper with another table.
   */
  token: string;
  status: TableStatus;
  amount: string;
  items: OrderItem[];
  /** Cumulative principal paid toward this table's bill (subtotal+tax; tip untracked). */
  paid: number;
  /** Units already paid per item (index-aligned to items); these lock permanently. */
  paidQty: number[];
  /** Live holds from phones currently choosing items. */
  reservations: Reservation[];
}

export interface Transaction {
  time: string;
  table: string;
  amount: string;
  method: string;
  /** Admin user id that owns the table this payment was made against. */
  owner: string;
}

/** A login role. The single `super` account manages `admin` accounts. */
export type Role = "super" | "admin";

/** Failed-login counter for one `email|ip` key, used for lockout. */
export interface LoginAttempt {
  fails: number;
  /** Counting window end (ms epoch); a later attempt resets the count. */
  windowEnd: number;
  /** Lockout expiry (ms epoch); 0 = not locked. */
  lockedUntil: number;
}

/**
 * A login account. Passwords are never stored in plaintext — `passwordHash` is
 * a PBKDF2 `salt.derivedKey` digest (see app/lib/auth.ts).
 */
/** How an account came to exist. `demo` = self-service trial from the marketing site. */
export type AccountSource = "manual" | "demo";

export interface AdminUser {
  id: string;
  /** Normalized (lowercased, trimmed) email — the login identifier. */
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
  /**
   * Access expiry (ISO). `null`/absent = never expires (super + manually-created
   * admins). Trial admins issued from the demo form expire 7 days out; an expired
   * account is instantly denied access (re-validated every request, like delete).
   */
  expiresAt?: string | null;
  /** Provenance — `demo` accounts are self-service trials. Defaults to `manual`. */
  source?: AccountSource;
}

export interface MenuMeta {
  filename: string;
  url: string;
  mime: string;
  originalName: string;
  uploadedAt: string;
}

// --- Structured menu items + in-app ordering (all optional) -----------------

/** A structured, orderable menu item defined by an admin. Optional feature: if
 *  an admin defines none, customers see only the PDF/image menu (unchanged). */
export interface MenuItem {
  id: string;
  /** Owning admin id. */
  owner: string;
  name: string;
  /** Unit price (currency-major, e.g. 12.5). */
  price: number;
  /** Free-form grouping ("Starters", "Mains"); "" = uncategorised. */
  category: string;
  description: string;
  /** When false the item is hidden from diners but kept for order history. */
  available: boolean;
  /** Sort position within the owner's menu. */
  sortOrder: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = "placed" | "preparing" | "served" | "cancelled";

/** One line of a customer order, with the diner's free-text note. */
export interface OrderLine {
  id: string;
  /** Source item id, or null if the item was later deleted. */
  menuItemId: string | null;
  /** Name/price snapshotted at order time so edits don't rewrite history. */
  name: string;
  price: number;
  qty: number;
  /** Diner note, e.g. "burger no cheese". */
  comment: string;
}

/** A customer order placed against a table. */
export interface Order {
  id: string;
  owner: string;
  /** Surrogate table id (relational) — stable across number reuse. */
  tableId: string;
  /** Display table number at order time. */
  tableNum: string;
  status: OrderStatus;
  lines: OrderLine[];
  /** Sum of line price*qty (pre-tax). */
  total: number;
  createdAt: string;
}

/** Public (diner-facing) menu payload returned alongside a table. */
export interface PublicMenu {
  /** Uploaded PDF/image, if any. */
  file: MenuMeta | null;
  /** Orderable items (available + not archived), if the admin defined any. */
  items: MenuItem[];
}

/** Per-restaurant (per-admin) profile + payment preferences. */
export interface RestaurantSettings {
  /** Display name shown to diners and on QR sheets ("" → derive from email). */
  name: string;
  /** Tax rate as a percent (e.g. 8 = 8%). Flows into the bill total. */
  taxRate: number;
  autoReceipts: boolean;
  tipPrompts: boolean;
}

/** A demo-request lead captured from the public marketing form. */
export interface Lead {
  id: string;
  name: string;
  email: string;
  restaurant: string;
  /** ISO timestamp. */
  ts: string;
}

export interface Store {
  tables: LiveTable[];
  transactions: Transaction[];
  /** Demo-request leads from the marketing site (newest first). */
  leads: Lead[];
  /** Menu per owning admin (keyed by user id) — each restaurant is independent. */
  menus: Record<string, MenuMeta>;
  /** Structured orderable items (optional feature). */
  menuItems?: MenuItem[];
  /** Customer orders (optional feature; newest first). */
  orders?: Order[];
  /** Per-owner restaurant settings (keyed by user id). */
  settings: Record<string, RestaurantSettings>;
  /** Login accounts (one `super`, plus admins it creates). */
  users: AdminUser[];
  /** Failed-login throttling, keyed by `email|ip`. */
  loginAttempts: Record<string, LoginAttempt>;
  /** Monotonic table-number allocator — never reuses a freed number. */
  seq: number;
  /** Optimistic-concurrency counter; bumped on every committed write. */
  version?: number;
}
