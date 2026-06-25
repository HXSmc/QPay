import { NextResponse } from "next/server";
import { deleteTable, setTableStatus } from "@/app/lib/store";
import type { TableStatus } from "@/app/lib/types";

const VALID: TableStatus[] = ["unpaid", "partial", "cleared", "open"];

export async function PATCH(
  req: Request,
  { params }: { params: { num: string } },
) {
  const body = (await req.json().catch(() => ({}))) as { status?: TableStatus };
  if (!body.status || !VALID.includes(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  const updated = await setTableStatus(params.num, body.status);
  if (!updated) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { num: string } },
) {
  const ok = await deleteTable(params.num);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
