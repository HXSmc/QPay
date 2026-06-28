import { NextResponse } from "next/server";
import { authedUser, deleteMenuItem, updateMenuItem } from "@/app/lib/store";
import { isSameOrigin } from "@/app/lib/auth";
import type { MenuItem } from "@/app/lib/types";

export const dynamic = "force-dynamic";

const MAX_NAME = 80;
const MAX_DESC = 280;
const MAX_CAT = 40;

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
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Partial<
    Pick<MenuItem, "name" | "price" | "category" | "description" | "available">
  > = {};
  if (typeof body.name === "string") {
    const n = body.name.trim().slice(0, MAX_NAME);
    if (!n) return NextResponse.json({ error: "name required" }, { status: 400 });
    patch.name = n;
  }
  if (body.price !== undefined) {
    if (typeof body.price !== "number" || !(body.price >= 0)) {
      return NextResponse.json({ error: "invalid price" }, { status: 400 });
    }
    patch.price = +body.price.toFixed(2);
  }
  if (typeof body.category === "string") patch.category = body.category.trim().slice(0, MAX_CAT);
  if (typeof body.description === "string")
    patch.description = body.description.trim().slice(0, MAX_DESC);
  if (typeof body.available === "boolean") patch.available = body.available;

  const updated = await updateMenuItem(user.id, id, patch);
  if (!updated) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
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
  const ok = await deleteMenuItem(user.id, id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
