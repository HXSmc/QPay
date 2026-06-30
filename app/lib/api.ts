// LeadInput is defined once with normalizeLead in store-core; re-export it here
// (type-only, erased at build) so the client form keeps a single source of truth.
import type { LeadInput } from "./store-core";
export type { LeadInput };
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
  /** Branch a branch-admin manages (role 'admin'); null otherwise. */
  branchId?: string | null;
  /** Display name of that branch, for the scoped dashboard header. */
  branchName?: string | null;
}

/** A branch-admin login, as the manager's team console sees it. */
export interface TeamAdmin {
  id: string;
  email: string;
  createdAt: string;
  active: boolean;
  branchId: string | null;
}

/** A manager → super contact message. */
export interface ContactMessage {
  id: string;
  managerId: string;
  managerEmail?: string;
  subject: string;
  body: string;
  status: "open" | "resolved";
  createdAt: string;
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
  /** Per-account config the super console displays/edits. */
  config?: {
    name: string;
    tables: number;
    branches: number;
    maxTables: number;
    maxBranches: number;
    posSystem: string;
  };
}

/** Fields the super sets when creating an account (name + POS are create-only). */
export interface NewAdminOptions {
  name?: string;
  tables?: number;
  maxTables?: number;
  branches?: number;
  maxBranches?: number;
  posSystem?: string;
  posApiKey?: string;
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

/** num+token → public menu for that table's owner (customer); omit → admin's own.
 *  A manager may pass `branchId` (3rd arg) to read a specific branch's menu. */
export async function getMenu(
  num?: string,
  token?: string,
  branchId?: string,
): Promise<MenuMeta | null> {
  const qs = num
    ? `?num=${encodeURIComponent(num)}&t=${encodeURIComponent(token ?? "")}`
    : branchId
      ? `?branch=${encodeURIComponent(branchId)}`
      : "";
  return json(await fetch(`/api/menu${qs}`, { cache: "no-store" }));
}

/** Longest-edge cap for menu photos. Phone-library shots are often 10–30 MP /
 *  many MB (and HEIC), which upload painfully slowly; downscale to this. */
const MENU_IMG_MAX_DIM = 2000;

/**
 * Downscale + re-encode a large image to JPEG client-side before upload (huge
 * phone photos / HEIC). PDFs and small images pass through unchanged. Best-
 * effort: any decode failure returns the original file.
 */
async function downscaleImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file; // PDFs etc. untouched
  // Skip the canvas decode for absurdly large files: decoding a pathological
  // image at full resolution can OOM the tab (an uncatchable crash). The server
  // rejects > MAX_BYTES (20MB) anyway, so passing it through just surfaces a
  // clean "too large" error instead of risking a crash.
  if (file.size > 30 * 1024 * 1024) return file;
  try {
    let width = 0;
    let height = 0;
    let source: CanvasImageSource | null = null;
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (bitmap) {
      width = bitmap.width;
      height = bitmap.height;
      source = bitmap;
    } else {
      const url = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement | null>((res) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => res(null);
        i.src = url;
      });
      URL.revokeObjectURL(url);
      if (!img) return file;
      width = img.naturalWidth;
      height = img.naturalHeight;
      source = img;
    }
    if (!width || !height || !source) return file;
    const scale = Math.min(1, MENU_IMG_MAX_DIM / Math.max(width, height));
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(source, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", 0.82),
    );
    if (!blob || blob.size >= file.size) return file; // no gain (or failed)
    const base = file.name.replace(/\.[^.]+$/, "") || "menu";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export async function uploadMenu(
  file: File,
  onProgress?: (pct: number) => void,
  branchId?: string,
): Promise<MenuMeta> {
  const branchQs = branchId ? `?branch=${encodeURIComponent(branchId)}` : "";
  // Shrink big phone photos (and convert HEIC→JPEG) before sending so uploads
  // don't crawl on mobile data.
  file = await downscaleImage(file);
  // Prod path: upload straight to Vercel Blob (no 4.5MB serverless body cap).
  // The /api/menu route mints a scoped token (after auth) and persists the meta.
  try {
    const { upload } = await import("@vercel/blob/client");
    const blob = await upload(`menu/${file.name}`, file, {
      access: "public",
      handleUploadUrl: `/api/menu${branchQs}`,
      contentType: file.type,
      clientPayload: JSON.stringify({ originalName: file.name }),
      onUploadProgress: onProgress
        ? (p: { percentage: number }) => onProgress(Math.round(p.percentage))
        : undefined,
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
    return json(await fetch(`/api/menu${branchQs}`, { method: "POST", body: fd }));
  }
}

export async function deleteMenu(branchId?: string): Promise<void> {
  const qs = branchId ? `?branch=${encodeURIComponent(branchId)}` : "";
  const res = await fetch(`/api/menu${qs}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`${res.status}`);
}

// --- Structured menu items + ordering (optional feature) ---

/** Admin: list own orderable items. A manager may scope to one branch. */
export async function listMenuItems(branchId?: string): Promise<MenuItem[]> {
  const qs = branchId ? `?branch=${encodeURIComponent(branchId)}` : "";
  return json(await fetch(`/api/menu/items${qs}`, { cache: "no-store" }));
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

export async function createMenuItem(
  input: {
    name: string;
    price: number;
    category?: string;
    description?: string;
  },
  branchId?: string,
): Promise<MenuItem> {
  return json(
    await fetch("/api/menu/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(branchId ? { ...input, branchId } : input),
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

/** Admin: list own orders (optionally only active = placed/preparing). A manager
 *  may scope to one branch via `branchId`. */
export async function listOrders(
  activeOnly = false,
  branchId?: string,
): Promise<Order[]> {
  const params = new URLSearchParams();
  if (activeOnly) params.set("active", "1");
  if (branchId) params.set("branch", branchId);
  const qs = params.toString();
  return json(
    await fetch(`/api/orders${qs ? `?${qs}` : ""}`, { cache: "no-store" }),
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
  opts: NewAdminOptions = {},
): Promise<{ ok: true; account: AdminAccount } | { ok: false; error: string }> {
  const res = await fetch("/api/admins", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, ...opts }),
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

/** Edit an admin's email/password and/or the super-editable config (counts +
 *  caps). Name + POS are NOT editable here (create-only / account-holder only). */
export async function updateAdmin(
  id: string,
  patch: {
    email?: string;
    password?: string;
    tables?: number;
    branches?: number;
    maxTables?: number;
    maxBranches?: number;
  },
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

export async function submitLead(
  input: LeadInput & { hp?: string },
): Promise<LeadResult> {
  return json(
    await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

// --- Manager: branch-admin (team) management ---

export async function listTeamAdmins(): Promise<TeamAdmin[]> {
  return json(await fetch("/api/managers/admins", { cache: "no-store" }));
}

export async function createTeamAdmin(
  email: string,
  password: string,
  branchId: string,
): Promise<{ ok: true; account: TeamAdmin } | { ok: false; error: string }> {
  const res = await fetch("/api/managers/admins", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, branchId }),
  });
  const data = (await res.json().catch(() => ({}))) as TeamAdmin | { error?: string };
  if (!res.ok) {
    return { ok: false, error: (data as { error?: string }).error || "failed" };
  }
  return { ok: true, account: data as TeamAdmin };
}

export async function updateTeamAdmin(
  id: string,
  patch: { email?: string; password?: string; branchId?: string },
): Promise<{ ok: true; account: TeamAdmin } | { ok: false; error: string }> {
  const res = await fetch(`/api/managers/admins/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = (await res.json().catch(() => ({}))) as {
    account?: TeamAdmin;
    error?: string;
  };
  if (!res.ok || !data.account) {
    return { ok: false, error: data.error || "failed" };
  }
  return { ok: true, account: data.account };
}

export async function deleteTeamAdmin(id: string): Promise<void> {
  const res = await fetch(`/api/managers/admins/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`${res.status}`);
}

// --- Contact channel (manager ↔ super) ---

export async function listContactMessages(): Promise<ContactMessage[]> {
  return json(await fetch("/api/contact", { cache: "no-store" }));
}

export async function sendContactMessage(
  subject: string,
  body: string,
): Promise<{ ok: true; message: ContactMessage } | { ok: false; error: string }> {
  const res = await fetch("/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ subject, body }),
  });
  const data = (await res.json().catch(() => ({}))) as ContactMessage | { error?: string };
  if (!res.ok) {
    return { ok: false, error: (data as { error?: string }).error || "failed" };
  }
  return { ok: true, message: data as ContactMessage };
}

export async function resolveContactMessage(
  id: string,
  status: "open" | "resolved",
): Promise<void> {
  const res = await fetch(`/api/contact/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`${res.status}`);
}
