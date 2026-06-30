import { NextResponse } from "next/server";
import { authedUser, deleteBranch, updateBranch } from "@/app/lib/store";
import { isSameOrigin } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

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
  // Editing a branch (incl. its POS) is a chain-owner action, not a branch-admin's.
  if (user.role === "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    name?: unknown;
    externalId?: unknown;
    posSystem?: unknown;
    posConfig?: unknown;
  };
  const patch: {
    name?: string;
    externalId?: string;
    posSystem?: string;
    posConfig?: Record<string, string>;
  } = {};
  if (typeof body.name === "string") patch.name = body.name;
  if (typeof body.externalId === "string") patch.externalId = body.externalId;
  if (typeof body.posSystem === "string") patch.posSystem = body.posSystem;
  if (body.posConfig && typeof body.posConfig === "object") {
    patch.posConfig = body.posConfig as Record<string, string>;
  }
  const updated = await updateBranch(user.id, id, patch);
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
  if (user.role === "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const res = await deleteBranch(user.id, id);
  if (!res.ok) {
    const status = res.reason === "last" ? 409 : 404;
    const error =
      res.reason === "last" ? "You must keep at least one branch." : "not found";
    return NextResponse.json({ error }, { status });
  }
  return NextResponse.json({ ok: true });
}
