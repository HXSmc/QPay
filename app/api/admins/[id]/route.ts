import { NextResponse } from "next/server";
import {
  authedUser,
  deleteAdmin,
  getAdmin,
  renewAdmin,
  setSettings,
  updateAdmin,
  RENEW_DAYS,
} from "@/app/lib/store";
import { hashPassword, isSameOrigin } from "@/app/lib/auth";
import { clientIp, rateLimit } from "@/app/lib/ratelimit";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireSuper(req: Request) {
  const user = await authedUser(req);
  return user?.role === "super" ? user : null;
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  if (!(await requireSuper(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  // deleteAdmin refuses to remove the super account and cascades the admin's
  // tables + receipts (+ menu/settings).
  const ok = await deleteAdmin(id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// Renew an admin's trial (+30d) or edit its email/password. Super only.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  if (!(await requireSuper(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!(await rateLimit("adminEdit", clientIp(req)))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }
  const { id } = await params;

  const body = (await req.json().catch(() => ({}))) as {
    action?: unknown;
    days?: unknown;
    email?: unknown;
    password?: unknown;
    tables?: unknown;
    branches?: unknown;
    maxTables?: unknown;
    maxBranches?: unknown;
  };

  // Renew --------------------------------------------------------------------
  if (body.action === "renew") {
    const days =
      typeof body.days === "number" && body.days > 0 && body.days <= 365
        ? Math.floor(body.days)
        : RENEW_DAYS;
    const acct = await renewAdmin(id, days);
    if (!acct) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true, account: acct });
  }

  // Edit email/password and/or the super-editable config (table/branch counts +
  // caps). The super CANNOT edit name or POS here (those are create-only / the
  // account holder's to edit) — they're ignored if sent.
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

  const num = (v: unknown) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
  };
  const settingsPatch: Record<string, number | undefined> = {};
  if (body.tables !== undefined) settingsPatch.tables = num(body.tables);
  if (body.branches !== undefined) settingsPatch.branches = num(body.branches);
  if (body.maxTables !== undefined) settingsPatch.maxTables = num(body.maxTables);
  if (body.maxBranches !== undefined) settingsPatch.maxBranches = num(body.maxBranches);
  const hasSettings = Object.keys(settingsPatch).length > 0;
  const hasCreds = !!(patch.email || patch.passwordHash);

  if (!hasCreds && !hasSettings) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  // Target must be an admin (super-only mutation; never edit the super itself here).
  const target = await getAdmin(id);
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });

  let account = target;
  if (hasCreds) {
    const result = await updateAdmin(id, patch);
    if (result === "duplicate") {
      return NextResponse.json(
        { error: "an account with that email already exists" },
        { status: 409 },
      );
    }
    if (!result) return NextResponse.json({ error: "not found" }, { status: 404 });
    account = result;
  }
  if (hasSettings) await setSettings(id, settingsPatch);
  return NextResponse.json({ ok: true, account });
}
