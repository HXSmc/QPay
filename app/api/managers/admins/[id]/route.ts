import { NextResponse } from "next/server";
import { hashPassword, isSameOrigin } from "@/app/lib/auth";
import {
  authedUser,
  deleteBranchAdmin,
  listBranches,
  updateBranchAdmin,
} from "@/app/lib/store";
import { clientIp, rateLimit } from "@/app/lib/ratelimit";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireManager(req: Request) {
  const user = await authedUser(req);
  return user?.role === "manager" ? user : null;
}

// Edit a branch-admin's email/password/branch. Manager (owner) only.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  const manager = await requireManager(req);
  if (!manager) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!(await rateLimit("adminEdit", clientIp(req)))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    email?: unknown;
    password?: unknown;
    branchId?: unknown;
  };
  const patch: { email?: string; passwordHash?: string; branchId?: string } = {};
  if (body.email !== undefined) {
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "invalid email" }, { status: 400 });
    }
    patch.email = email;
  }
  if (body.password !== undefined) {
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 8) {
      return NextResponse.json(
        { error: "password must be at least 8 characters" },
        { status: 400 },
      );
    }
    patch.passwordHash = await hashPassword(password);
  }
  if (body.branchId !== undefined) {
    const branchId = typeof body.branchId === "string" ? body.branchId : "";
    const branches = await listBranches(manager.id);
    if (!branches.some((b) => b.id === branchId)) {
      return NextResponse.json({ error: "invalid branch" }, { status: 400 });
    }
    patch.branchId = branchId;
  }
  if (!patch.email && !patch.passwordHash && !patch.branchId) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  const result = await updateBranchAdmin(manager.id, id, patch);
  if (result === "duplicate") {
    return NextResponse.json(
      { error: "an account with that email already exists" },
      { status: 409 },
    );
  }
  if (!result) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, account: result });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  const manager = await requireManager(req);
  if (!manager) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const ok = await deleteBranchAdmin(manager.id, id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
