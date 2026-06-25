export type SplitMode = "full" | "equal" | "item";
export type TipKey = "0" | "10" | "15" | "20" | "custom";

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

export type TableStatus = "unpaid" | "partial" | "cleared" | "open";

export interface LiveTable {
  num: string;
  status: TableStatus;
  amount: string;
  items: OrderItem[];
}

export interface Transaction {
  time: string;
  table: string;
  amount: string;
  method: string;
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
  menu: MenuMeta | null;
}
