import type {
  Branch,
  LiveTable,
  MenuItem,
  MenuMeta,
  Order,
  OrderItem,
  OrderStatus,
  RestaurantSettings,
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
  /** ISO expiry, or null for never-expiring (manual admins). */
  expiresAt: string | null;
  /** `demo` = self-service trial from the marketing site. */
  source: "manual" | "demo";
  /** False once the expiry has passed. */
  active: boolean;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    // Surface the server's {error} message (most handlers return one) so the UI
    // can show something specific instead of a bare status code.
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) msg = body.error;
    } catch {
      /* non-JSON body — keep the status line */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export async function listTables(): Promise<LiveTable[]> {
  return json(await fetch("/api/tables", { cache: "no-store" }));
}

export async function createTable(branchId?: string): Promise<LiveTable> {
  return json(
    await fetch("/api/tables", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(branchId ? { branchId } : {}),
    }),
  );
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

/** num+token → public menu for that table's owner (customer); omit → admin's own. */
export async function getMenu(
  num?: string,
  token?: string,
): Promise<MenuMeta | null> {
  const qs = num
    ? `?num=${encodeURIComponent(num)}&t=${encodeURIComponent(token ?? "")}`
    : "";
  return json(await fetch(`/api/menu${qs}`, { cache: "no-store" }));
}

export async function uploadMenu(file: File): Promise<MenuMeta> {
  // Prod path: upload straight to Vercel Blob (no 4.5MB serverless body cap).
  // The /api/menu route mints a scoped token (after auth) and persists the meta.
  try {
    const { upload } = await import("@vercel/blob/client");
    const blob = await upload(`menu/${file.name}`, file, {
      access: "public",
      handleUploadUrl: "/api/menu",
      contentType: file.type,
      clientPayload: JSON.stringify({ originalName: file.name }),
    });
    return {
      filename: blob.pathname,
      url: blob.url,
      mime: file.type,
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    };
  } catch (e) {
    // Genuine rejections (auth / unsupported type / too large) must surface.
    const msg = e instanceof Error ? e.message : "";
    if (/unauthorized|content type|too large|maximum|not allowed/i.test(msg)) {
      throw e;
    }
    // Otherwise fall back to the server multipart path (local dev / no Blob).
    const fd = new FormData();
    fd.append("file", file);
    return json(await fetch("/api/menu", { method: "POST", body: fd }));
  }
}

export async function deleteMenu(): Promise<void> {
  const res = await fetch("/api/menu", { method: "DELETE" });
  if (!res.ok) throw new Error(`${res.status}`);
}

// --- Structured menu items + ordering (optional feature) ---

/** Admin: list own orderable items. */
export async function listMenuItems(): Promise<MenuItem[]> {
  return json(await fetch("/api/menu/items", { cache: "no-store" }));
}

/** Customer: list orderable items for a table (token-gated). */
export async function getPublicMenuItems(
  num: string,
  token: string,
): Promise<MenuItem[]> {
  return json(
    await fetch(
      `/api/menu/items?num=${encodeURIComponent(num)}&t=${encodeURIComponent(token)}`,
      { cache: "no-store" },
    ),
  );
}

export async function createMenuItem(input: {
  name: string;
  price: number;
  category?: string;
  description?: string;
}): Promise<MenuItem> {
  return json(
    await fetch("/api/menu/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function updateMenuItem(
  id: string,
  patch: Partial<Pick<MenuItem, "name" | "price" | "category" | "description" | "available">>,
): Promise<MenuItem> {
  return json(
    await fetch(`/api/menu/items/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteMenuItem(id: string): Promise<void> {
  const res = await fetch(`/api/menu/items/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`${res.status}`);
}

/** Customer: place an order (token-gated). Returns the created order (no owner). */
export async function placeOrder(
  token: string,
  lines: { menuItemId: string; qty: number; comment: string }[],
): Promise<Omit<Order, "owner">> {
  return json(
    await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, lines }),
    }),
  );
}

/** Admin: list own orders (optionally only active = placed/preparing). */
export async function listOrders(activeOnly = false): Promise<Order[]> {
  return json(
    await fetch(`/api/orders${activeOnly ? "?active=1" : ""}`, {
      cache: "no-store",
    }),
  );
}

export async function setOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<Order> {
  return json(
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    }),
  );
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

/** Renew an admin's trial by `days` (default 30 server-side). */
export async function renewAdmin(
  id: string,
  days?: number,
): Promise<{ ok: true; account: AdminAccount } | { ok: false; error: string }> {
  const res = await fetch(`/api/admins/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "renew", days }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    account?: AdminAccount;
    error?: string;
  };
  if (!res.ok || !data.account) {
    return { ok: false, error: data.error || "failed" };
  }
  return { ok: true, account: data.account };
}

/** Edit an admin's email and/or password (super only). */
export async function updateAdmin(
  id: string,
  patch: { email?: string; password?: string },
): Promise<{ ok: true; account: AdminAccount } | { ok: false; error: string }> {
  const res = await fetch(`/api/admins/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = (await res.json().catch(() => ({}))) as {
    account?: AdminAccount;
    error?: string;
  };
  if (!res.ok || !data.account) {
    return { ok: false, error: data.error || "failed" };
  }
  return { ok: true, account: data.account };
}

// --- Restaurant settings (admin's own) ---

export async function getSettings(): Promise<RestaurantSettings> {
  return json(await fetch("/api/settings", { cache: "no-store" }));
}

export async function saveSettings(
  patch: Partial<RestaurantSettings>,
): Promise<RestaurantSettings> {
  return json(
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }),
  );
}

// --- Branches (multi-location) ---

export async function listBranches(): Promise<Branch[]> {
  return json(await fetch("/api/branches", { cache: "no-store" }));
}

export async function createBranch(name: string): Promise<Branch> {
  return json(
    await fetch("/api/branches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  );
}

export async function updateBranch(
  id: string,
  patch: { name?: string; externalId?: string; posSystem?: string; posConfig?: Record<string, string> },
): Promise<Branch> {
  return json(
    await fetch(`/api/branches/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteBranch(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`/api/branches/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: data.error || "failed" };
  }
  return { ok: true };
}

export interface PosTestResult {
  ok: boolean;
  message: string;
  automated: boolean;
}

/** Verify a saved POS connection (account-level, or a specific branch). */
export async function testPosConnection(branchId?: string): Promise<PosTestResult> {
  return json(
    await fetch("/api/pos/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(branchId ? { branchId } : {}),
    }),
  );
}

// --- Marketing demo-request lead ---

export interface LeadResult {
  /** created = trial issued + emailed; exists = email already had an account;
   *  received = sales inquiry captured (no trial). */
  status: "created" | "exists" | "received";
  /** Whether the credential / contact-sales email actually went out. */
  emailed?: boolean;
}

export interface LeadInput {
  name: string;
  email: string;
  restaurant: string;
  /** demo (default) provisions a trial; sales is a contact-only inquiry. */
  kind?: "demo" | "sales";
  phone?: string;
  tables?: number;
  branches?: number;
  posSystem?: string;
  preferredDates?: string;
  message?: string;
}

export async function submitLead(input: LeadInput): Promise<LeadResult> {
  return json(
    await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}
