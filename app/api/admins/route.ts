import { NextResponse } from "next/server";
import { hashPassword, isSameOrigin } from "@/app/lib/auth";
import { authedUser, createAdmin, listAdmins, seedAdminAccount } from "@/app/lib/store";
import { isPosSystem } from "@/app/lib/pos";
import { notifySuperAdmin } from "@/app/lib/email";
import { clientIp, rateLimit } from "@/app/lib/ratelimit";

export const dynamic = "force-dynamic";

// Managing admin accounts is reserved for the single (live) super account.
async function requireSuper(req: Request) {
  const user = await authedUser(req);
  return user?.role === "super" ? user : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(req: Request) {
  if (!(await requireSuper(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await listAdmins());
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  if (!(await requireSuper(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!(await rateLimit("adminCreate", clientIp(req)))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    email?: unknown;
    password?: unknown;
    name?: unknown;
    tables?: unknown;
    maxTables?: unknown;
    branches?: unknown;
    maxBranches?: unknown;
    posSystem?: unknown;
    posApiKey?: unknown;
  };
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const created = await createAdmin(email, await hashPassword(password));
  if (!created) {
    return NextResponse.json(
      { error: "an account with that email already exists" },
      { status: 409 },
    );
  }

  // Seed the new account's config from the create form (name, table/branch
  // counts + caps, POS + its primary API key). Best-effort — never fail the
  // already-created account on a seed error.
  const num = (v: unknown) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
  };
  try {
    await seedAdminAccount(created.id, {
      name: typeof body.name === "string" ? body.name : undefined,
      tables: num(body.tables),
      maxTables: num(body.maxTables),
      branches: num(body.branches),
      maxBranches: num(body.maxBranches),
      posSystem: isPosSystem(body.posSystem) ? body.posSystem : undefined,
      posApiKey: typeof body.posApiKey === "string" ? body.posApiKey : undefined,
    });
  } catch (e) {
    // Account is already created; config can still be set in admin settings. Log
    // so a half-provisioned account is visible instead of silently swallowed.
    console.error("[seedAdminAccount] failed for", created.id, e);
  }
  await notifySuperAdmin(`New manager account created: ${created.email}`, [
    `A manager (chain owner) account was created from the super console.`,
    ``,
    `Email: ${created.email}`,
    `Name: ${typeof body.name === "string" ? body.name : "—"}`,
  ]).catch(() => {});
  return NextResponse.json(created, { status: 201 });
}
