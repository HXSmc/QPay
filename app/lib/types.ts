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
export interface AdminUser {
  id: string;
  /** Normalized (lowercased, trimmed) email — the login identifier. */
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
}

export interface MenuMeta {
  filename: string;
  url: string;
  mime: string;
  originalName: string;
  uploadedAt: string;
}

export interface Store {
  tables: LiveTable[];
  transactions: Transaction[];
  /** Menu per owning admin (keyed by user id) — each restaurant is independent. */
  menus: Record<string, MenuMeta>;
  /** Login accounts (one `super`, plus admins it creates). */
  users: AdminUser[];
  /** Failed-login throttling, keyed by `email|ip`. */
  loginAttempts: Record<string, LoginAttempt>;
  /** Monotonic table-number allocator — never reuses a freed number. */
  seq: number;
  /** Optimistic-concurrency counter; bumped on every committed write. */
  version?: number;
}
