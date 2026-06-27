import type {
  LiveTable,
  MenuMeta,
  OrderItem,
  Role,
  TableStatus,
  Transaction,
} from "./types";

export interface Me {
  id: string;
  email: string;
  role: Role;
}

export interface AdminAccount {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}

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

export async function payTable(
  num: string,
  amount: number,
  opts: { id?: string; items?: number[]; method?: string; token: string },
): Promise<LiveTable> {
  return json(
    await fetch(`/api/tables/${num}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pay: amount,
        id: opts.id,
        payItems: opts.items,
        method: opts.method,
        token: opts.token,
      }),
    }),
  );
}

/** Heartbeat this phone's live item hold and read back the merged table state. */
export async function syncTable(
  num: string,
  id: string,
  qty: number[],
  token: string,
): Promise<LiveTable> {
  return json(
    await fetch(`/api/tables/${num}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sync: { id, qty, token } }),
    }),
  );
}

export async function deleteTable(num: string): Promise<void> {
  const res = await fetch(`/api/tables/${num}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`${res.status}`);
}

export async function getTable(
  num: string,
  token: string,
): Promise<LiveTable> {
  return json(
    await fetch(`/api/tables/${num}?t=${encodeURIComponent(token)}`, {
      cache: "no-store",
    }),
  );
}

export async function setTableItems(
  num: string,
  items: OrderItem[],
): Promise<LiveTable> {
  return json(
    await fetch(`/api/tables/${num}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items }),
    }),
  );
}

export async function listTransactions(): Promise<Transaction[]> {
  return json(await fetch("/api/transactions", { cache: "no-store" }));
}

/** num set → public menu for that table's owner (customer); omit → admin's own. */
export async function getMenu(num?: string): Promise<MenuMeta | null> {
  const qs = num ? `?num=${encodeURIComponent(num)}` : "";
  return json(await fetch(`/api/menu${qs}`, { cache: "no-store" }));
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

/** Sign in. Returns the role on success, or null on bad credentials. */
export async function login(
  email: string,
  password: string,
): Promise<Role | null> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => ({}))) as { role?: Role };
  return data.role ?? "admin";
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function getMe(): Promise<Me> {
  return json(await fetch("/api/auth/me", { cache: "no-store" }));
}

// --- Super-account admin management ---

export async function listAdmins(): Promise<AdminAccount[]> {
  return json(await fetch("/api/admins", { cache: "no-store" }));
}

/** Create an admin. Returns the new account, or an error message on failure. */
export async function createAdmin(
  email: string,
  password: string,
): Promise<{ ok: true; account: AdminAccount } | { ok: false; error: string }> {
  const res = await fetch("/api/admins", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json().catch(() => ({}))) as
    | AdminAccount
    | { error?: string };
  if (!res.ok) {
    return { ok: false, error: (data as { error?: string }).error || "failed" };
  }
  return { ok: true, account: data as AdminAccount };
}

export async function deleteAdmin(id: string): Promise<void> {
  const res = await fetch(`/api/admins/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`${res.status}`);
}
