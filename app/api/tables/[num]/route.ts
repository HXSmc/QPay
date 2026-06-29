import { NextResponse } from "next/server";
import {
  authedUser,
  deleteTable,
  getTableByToken,
  payTable,
  setTableItems,
  setTableStatus,
  syncReservation,
} from "@/app/lib/store";
import { isSameOrigin } from "@/app/lib/auth";
import { allow, clientIp } from "@/app/lib/ratelimit";
import type { OrderItem, TableStatus } from "@/app/lib/types";

export const dynamic = "force-dynamic";

const VALID: TableStatus[] = ["unpaid", "partial", "cleared", "open"];
const MAX_ITEMS = 100;

// Public (customer) responses must not disclose the owning admin's internal
// user id or the secret capability token — strip both.
function publicTable<T extends { owner: string; token: string }>(
  t: T,
): Omit<T, "owner" | "token"> {
  const { owner: _o, token: _t, ...rest } = t;
  void _o;
  void _t;
  return rest;
}

// Unit counts (item holds / paid quantities) must be non-negative integers.
function numArray(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_ITEMS) return null;
  const out: number[] = [];
  for (const n of raw) {
    if (typeof n !== "number" || !Number.isInteger(n) || n < 0) return null;
    out.push(n);
  }
  return out;
}

function sanitizeItems(raw: unknown): OrderItem[] | null {
  // Cap the order size to match numArray's MAX_ITEMS, so live sync / item-split
  // payment (which send per-item qty arrays) can never be rejected on a table
  // that was allowed to grow past the cap.
  if (!Array.isArray(raw) || raw.length > MAX_ITEMS) return null;
  const items: OrderItem[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") return null;
    const { name, qty, price } = r as Record<string, unknown>;
    if (typeof name !== "string" || !name.trim()) return null;
    if (typeof qty !== "number" || qty < 1) return null;
    if (typeof price !== "number" || price < 0) return null;
    items.push({ name: name.trim(), qty, price });
  }
  return items;
}

export async function GET(req: Request) {
  // Resolve by the capability token from the QR URL (?t=…); `num` is now
  // per-owner so it can't identify a table on its own. A 404 for both "missing"
  // and "wrong token" so nothing can be enumerated.
  const token = new URL(req.url).searchParams.get("t");
  const table = token ? await getTableByToken(token) : null;
  if (!table) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(publicTable(table));
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ num: string }> },
) {
  const { num } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    status?: TableStatus;
    items?: unknown;
    pay?: unknown;
    id?: unknown;
    payItems?: unknown;
    method?: unknown;
    token?: unknown;
    sync?: { id?: unknown; qty?: unknown; token?: unknown };
  };

  if (body.sync !== undefined) {
    const id = body.sync?.id;
    const qty = numArray(body.sync?.qty);
    const token = body.sync?.token;
    if (typeof id !== "string" || !id || !qty || typeof token !== "string") {
      return NextResponse.json({ error: "invalid sync" }, { status: 400 });
    }
    // Key the throttle on the capability token (the real table identity), NOT
    // the URL `num` — which the resolver ignores and an attacker can rotate to
    // mint unlimited fresh rate-limit buckets for the same table.
    if (!allow(`sync|${clientIp(req)}|${token}`, 40, 60_000)) {
      return NextResponse.json({ error: "rate limited" }, { status: 429 });
    }
    const updated = await syncReservation(num, id, qty, token);
    if (!updated) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(publicTable(updated));
  }

  if (body.pay !== undefined) {
    if (typeof body.pay !== "number" || !(body.pay > 0)) {
      return NextResponse.json({ error: "invalid pay" }, { status: 400 });
    }
    if (typeof body.token !== "string" || !body.token) {
      return NextResponse.json({ error: "invalid token" }, { status: 400 });
    }
    // Throttle on the capability token, not the spoofable URL `num` (see sync).
    if (!allow(`pay|${clientIp(req)}|${body.token}`, 15, 60_000)) {
      return NextResponse.json({ error: "rate limited" }, { status: 429 });
    }
    const id = typeof body.id === "string" ? body.id : undefined;
    const items =
      body.payItems === undefined ? undefined : numArray(body.payItems);
    if (body.payItems !== undefined && !items) {
      return NextResponse.json({ error: "invalid payItems" }, { status: 400 });
    }
    // Constrain method to a safe charset (defends the CSV export against
    // formula/control-char injection from this unauthenticated endpoint).
    const method =
      typeof body.method === "string"
        ? body.method.replace(/[^A-Za-z0-9 .•#*-]/g, "").slice(0, 24)
        : undefined;
    const updated = await payTable(num, body.pay, {
      id,
      items: items ?? undefined,
      method,
      token: body.token,
    });
    if (!updated) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(publicTable(updated));
  }

  if (body.items !== undefined) {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: "bad origin" }, { status: 403 });
    }
    const user = await authedUser(req);
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const items = sanitizeItems(body.items);
    if (!items) {
      return NextResponse.json({ error: "invalid items" }, { status: 400 });
    }
    // Scoped to the caller's own tables — a 404 covers both "no such table" and
    // "not yours" so ownership isn't leaked.
    const updated = await setTableItems(num, items, user.id);
    if (!updated) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  }

  if (body.status) {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: "bad origin" }, { status: 403 });
    }
    const user = await authedUser(req);
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!VALID.includes(body.status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    const updated = await setTableStatus(num, body.status, user.id);
    if (!updated) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "nothing to update" }, { status: 400 });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ num: string }> },
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { num } = await params;
  const ok = await deleteTable(num, user.id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
