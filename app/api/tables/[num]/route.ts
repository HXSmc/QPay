import { NextResponse } from "next/server";
import {
  deleteTable,
  getTable,
  payTable,
  setTableItems,
  setTableStatus,
} from "@/app/lib/store";
import type { OrderItem, TableStatus } from "@/app/lib/types";

export const dynamic = "force-dynamic";

const VALID: TableStatus[] = ["unpaid", "partial", "cleared", "open"];

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
  return NextResponse.json(table);
}

export async function PATCH(
  req: Request,
  { params }: { params: { num: string } },
) {
  const body = (await req.json().catch(() => ({}))) as {
    status?: TableStatus;
    items?: unknown;
    pay?: unknown;
  };

  if (body.pay !== undefined) {
    if (typeof body.pay !== "number" || !(body.pay > 0)) {
      return NextResponse.json({ error: "invalid pay" }, { status: 400 });
    }
    const updated = await payTable(params.num, body.pay);
    if (!updated) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  }

  if (body.items !== undefined) {
    const items = sanitizeItems(body.items);
    if (!items) {
      return NextResponse.json({ error: "invalid items" }, { status: 400 });
    }
    const updated = await setTableItems(params.num, items);
    if (!updated) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  }

  if (body.status) {
    if (!VALID.includes(body.status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    const updated = await setTableStatus(params.num, body.status);
    if (!updated) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "nothing to update" }, { status: 400 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { num: string } },
) {
  const ok = await deleteTable(params.num);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
