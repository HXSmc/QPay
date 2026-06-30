import { NextResponse } from "next/server";
import { authedUser, scopeFor, updateOrderStatus } from "@/app/lib/store";
import { isSameOrigin } from "@/app/lib/auth";
import type { OrderStatus } from "@/app/lib/types";

export const dynamic = "force-dynamic";

const VALID: OrderStatus[] = ["placed", "preparing", "served", "cancelled"];

// PATCH → admin: advance an order's status (placed → preparing → served, or cancel).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { status?: unknown };
  if (typeof body.status !== "string" || !VALID.includes(body.status as OrderStatus)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  const scope = scopeFor(user);
  const updated = await updateOrderStatus(
    scope.ownerId,
    id,
    body.status as OrderStatus,
    scope.branchId,
  );
  if (!updated) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
