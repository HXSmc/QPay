import { NextResponse } from "next/server";
import { addLead, authedUser, listLeads } from "@/app/lib/store";
import { isSameOrigin } from "@/app/lib/auth";
import { allow, clientIp } from "@/app/lib/ratelimit";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public demo-request capture from the marketing form.
export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  if (!allow(`lead|${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    name?: unknown;
    email?: unknown;
    restaurant?: unknown;
  };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const restaurant =
    typeof body.restaurant === "string" ? body.restaurant.trim() : "";
  // Bound lengths BEFORE validating so the stored value always matches what we
  // validated (addLead also slices, but validating the truncated form here
  // keeps a stored email from being silently cut to something invalid).
  if (
    !name ||
    name.length > 120 ||
    !restaurant ||
    restaurant.length > 120 ||
    email.length > 254 ||
    !EMAIL_RE.test(email)
  ) {
    return NextResponse.json({ error: "invalid form" }, { status: 400 });
  }
  await addLead({ name, email, restaurant });
  return NextResponse.json({ ok: true }, { status: 201 });
}

// Captured leads — super only.
export async function GET(req: Request) {
  const user = await authedUser(req);
  if (user?.role !== "super") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await listLeads());
}
