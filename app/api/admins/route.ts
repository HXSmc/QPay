import { NextResponse } from "next/server";
import { hashPassword, isSameOrigin } from "@/app/lib/auth";
import { authedUser, createAdmin, listAdmins } from "@/app/lib/store";
import { allow, clientIp } from "@/app/lib/ratelimit";

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
  if (!allow(`admin-create|${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    email?: unknown;
    password?: unknown;
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
  return NextResponse.json(created, { status: 201 });
}
