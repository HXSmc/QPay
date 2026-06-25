import type { LiveTable, MenuMeta, TableStatus, Transaction } from "./types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function listTables(): Promise<LiveTable[]> {
  return json(await fetch("/api/tables", { cache: "no-store" }));
}

export async function createTable(): Promise<LiveTable> {
  return json(await fetch("/api/tables", { method: "POST" }));
}

export async function setTableStatus(
  num: string,
  status: TableStatus,
): Promise<LiveTable> {
  return json(
    await fetch(`/api/tables/${num}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    }),
  );
}

export async function deleteTable(num: string): Promise<void> {
  const res = await fetch(`/api/tables/${num}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`${res.status}`);
}

export async function listTransactions(): Promise<Transaction[]> {
  return json(await fetch("/api/transactions", { cache: "no-store" }));
}

export async function getMenu(): Promise<MenuMeta | null> {
  return json(await fetch("/api/menu", { cache: "no-store" }));
}

export async function uploadMenu(file: File): Promise<MenuMeta> {
  const fd = new FormData();
  fd.append("file", file);
  return json(await fetch("/api/menu", { method: "POST", body: fd }));
}

export async function deleteMenu(): Promise<void> {
  const res = await fetch("/api/menu", { method: "DELETE" });
  if (!res.ok) throw new Error(`${res.status}`);
}

export async function login(
  email: string,
  password: string,
): Promise<boolean> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.ok;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}
