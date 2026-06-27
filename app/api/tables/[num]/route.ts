import { NextResponse } from "next/server";
import {
  deleteTable,
  getTable,
  payTable,
  setTableItems,
  setTableStatus,
  syncReservation,
} from "@/app/lib/store";
import type { OrderItem, TableStatus } from "@/app/lib/types";
import { getSession } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

const VALID: TableStatus[] = ["unpaid", "partial", "cleared", "open"];

// Public (customer) responses must not disclose the owning admin's internal
// user id — strip it. (Admin responses legitimately echo the caller's own id.)
function publicTable<T extends { owner: string }>(t: T): Omit<T, "owner"> {
  const { owner: _owner, ...rest } = t;
  void _owner;
  return rest;
}

// Unit counts (item holds / paid quantities) must be non-negative integers.
const MAX_ITEMS = 100;
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
  if (!Array.isArray(raw)) return null;
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

export async function GET(
  _req: Request,
  { params }: { params: { num: string } },
) {
  const table = await getTable(params.num);
  if (!table) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(publicTable(table));
}

export async function PATCH(
  req: Request,
  { params }: { params: { num: string } },
) {
  const body = (await req.json().catch(() => ({}))) as {
    status?: TableStatus;
    items?: unknown;
    pay?: unknown;
    id?: unknown;
    payItems?: unknown;
    method?: unknown;
    sync?: { id?: unknown; qty?: unknown };
  };

  if (body.sync !== undefined) {
    const id = body.sync?.id;
    const qty = numArray(body.sync?.qty);
    if (typeof id !== "string" || !id || !qty) {
      return NextResponse.json({ error: "invalid sync" }, { status: 400 });
    }
    const updated = await syncReservation(params.num, id, qty);
    if (!updated) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(publicTable(updated));
  }

  if (body.pay !== undefined) {
    if (typeof body.pay !== "number" || !(body.pay > 0)) {
      return NextResponse.json({ error: "invalid pay" }, { status: 400 });
    }
    const id = typeof body.id === "string" ? body.id : undefined;
    const items =
      body.payItems === undefined ? undefined : numArray(body.payItems);
    if (body.payItems !== undefined && !items) {
      return NextResponse.json({ error: "invalid payItems" }, { status: 400 });
    }
    const method =
      typeof body.method === "string" ? body.method.slice(0, 24) : undefined;
    const updated = await payTable(params.num, body.pay, {
      id,
      items: items ?? undefined,
      method,
    });
    if (!updated) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(publicTable(updated));
  }

  if (body.items !== undefined) {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const items = sanitizeItems(body.items);
    if (!items) {
      return NextResponse.json({ error: "invalid items" }, { status: 400 });
    }
    // Scoped to the caller's own tables — a 404 covers both "no such table" and
    // "not yours" so ownership isn't leaked.
    const updated = await setTableItems(params.num, items, session.sub);
    if (!updated) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  }

  if (body.status) {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!VALID.includes(body.status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    const updated = await setTableStatus(params.num, body.status, session.sub);
    if (!updated) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "nothing to update" }, { status: 400 });
}

export async function DELETE(
  req: Request,
  { params }: { params: { num: string } },
) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const ok = await deleteTable(params.num, session.sub);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
