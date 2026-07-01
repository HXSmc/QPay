import { NextResponse } from "next/server";
import { hashPassword, isSameOrigin } from "@/app/lib/auth";
import {
  authedUser,
  createBranchAdmin,
  listBranchAdmins,
  listBranches,
} from "@/app/lib/store";
import { notifySuperAdmin } from "@/app/lib/email";
import { clientIp, rateLimit } from "@/app/lib/ratelimit";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Creating + managing branch-admin logins is a MANAGER action (chain owner).
async function requireManager(req: Request) {
  const user = await authedUser(req);
  return user?.role === "manager" ? user : null;
}

export async function GET(req: Request) {
  const manager = await requireManager(req);
  if (!manager) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await listBranchAdmins(manager.id));
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  const manager = await requireManager(req);
  if (!manager) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!(await rateLimit("adminCreate", clientIp(req)))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    email?: unknown;
    password?: unknown;
    branchId?: unknown;
  };
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const branchId = typeof body.branchId === "string" ? body.branchId : "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "password must be at least 8 characters" },
      { status: 400 },
    );
  }
  // The branch must be one this manager owns.
  const branches = await listBranches(manager.id);
  if (!branches.some((b) => b.id === branchId)) {
    return NextResponse.json({ error: "invalid branch" }, { status: 400 });
  }

  const created = await createBranchAdmin(
    manager.id,
    branchId,
    email,
    await hashPassword(password),
  );
  if (!created) {
    return NextResponse.json(
      { error: "an account with that email already exists" },
      { status: 409 },
    );
  }
  const branchName = branches.find((b) => b.id === branchId)?.name ?? branchId;
  await notifySuperAdmin(`New branch-admin created: ${created.email}`, [
    `A manager created a branch-admin login.`,
    ``,
    `Branch-admin: ${created.email}`,
    `Branch: ${branchName}`,
    `Manager: ${manager.email}`,
  ]).catch(() => {});
  return NextResponse.json(created, { status: 201 });
}
