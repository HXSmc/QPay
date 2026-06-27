import { NextResponse } from "next/server";
import {
  authedUser,
  deleteAdmin,
  renewAdmin,
  updateAdmin,
  RENEW_DAYS,
} from "@/app/lib/store";
import { hashPassword, isSameOrigin } from "@/app/lib/auth";
import { allow, clientIp } from "@/app/lib/ratelimit";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireSuper(req: Request) {
  const user = await authedUser(req);
  return user?.role === "super" ? user : null;
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  if (!(await requireSuper(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // deleteAdmin refuses to remove the super account and cascades the admin's
  // tables + receipts (+ menu/settings).
  const ok = await deleteAdmin(params.id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// Renew an admin's trial (+30d) or edit its email/password. Super only.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  if (!(await requireSuper(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!allow(`admin-edit|${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: unknown;
    days?: unknown;
    email?: unknown;
    password?: unknown;
  };

  // Renew --------------------------------------------------------------------
  if (body.action === "renew") {
    const days =
      typeof body.days === "number" && body.days > 0 && body.days <= 365
        ? Math.floor(body.days)
        : RENEW_DAYS;
    const acct = await renewAdmin(params.id, days);
    if (!acct) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true, account: acct });
  }

  // Edit email and/or password ----------------------------------------------
  const patch: { email?: string; passwordHash?: string } = {};
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
  if (!patch.email && !patch.passwordHash) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  const result = await updateAdmin(params.id, patch);
  if (result === "duplicate") {
    return NextResponse.json(
      { error: "an account with that email already exists" },
      { status: 409 },
    );
  }
  if (!result) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, account: result });
}
