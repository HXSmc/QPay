import { NextResponse } from "next/server";
import { addLead, authedUser, listLeads, provisionTrialAdmin } from "@/app/lib/store";
import { isSameOrigin } from "@/app/lib/auth";
import { sendContactSales, sendTrialCredentials } from "@/app/lib/email";
import { SITE } from "@/app/lib/site";
import { allow, clientIp } from "@/app/lib/ratelimit";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Absolute /admin/login URL for the email link. Uses the configured canonical
 *  origin so a forged Host header on this public endpoint can't poison the link
 *  (host-header injection); only localhost dev falls back to the request host. */
function loginUrl(req: Request): string {
  try {
    const u = new URL(req.url);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
      return `${u.protocol}//${u.host}/admin/login`;
    }
  } catch {
    /* fall through to the canonical base */
  }
  return `${SITE.appUrl}/admin/login`;
}

// Public demo request → provisions a 7-day trial admin and emails the password.
// One trial per email: a repeat request for an email that already has an account
// gets a "contact sales" email instead (no self-service renewal).
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
    kind?: unknown;
    phone?: unknown;
    tables?: unknown;
    branches?: unknown;
    posSystem?: unknown;
    preferredDates?: unknown;
    message?: unknown;
  };
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const num = (v: unknown) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
  };
  const kind: "demo" | "sales" = body.kind === "sales" ? "sales" : "demo";
  const name = str(body.name);
  const email = str(body.email);
  const restaurant = str(body.restaurant);
  const phone = str(body.phone);
  const profile = {
    phone,
    tables: num(body.tables),
    branches: num(body.branches),
    posSystem: str(body.posSystem) || undefined,
    preferredDates: str(body.preferredDates) || undefined,
    message: str(body.message) || undefined,
  };

  // Common validation.
  if (!name || name.length > 120 || !restaurant || restaurant.length > 120) {
    return NextResponse.json({ error: "invalid form" }, { status: 400 });
  }
  // Email is required + valid for a demo (we email the trial login). For a sales
  // inquiry it's optional, but if present it must be valid, and we require at
  // least one way to reach them (email or phone).
  const emailOk = !!email && email.length <= 254 && EMAIL_RE.test(email);
  if (kind === "demo" && !emailOk) {
    return NextResponse.json({ error: "invalid form" }, { status: 400 });
  }
  if (kind === "sales") {
    if (email && !emailOk) {
      return NextResponse.json({ error: "invalid form" }, { status: 400 });
    }
    if (!email && !phone) {
      return NextResponse.json({ error: "invalid form" }, { status: 400 });
    }
  }

  // Always capture the lead (with whatever profiling fields were provided).
  await addLead({ name, email, restaurant, kind, ...profile });

  // A sales inquiry never provisions a trial — the team follows up directly.
  if (kind === "sales") {
    return NextResponse.json({ ok: true, status: "received" }, { status: 201 });
  }

  // Demo: provision (or decline) the trial, then send the matching email.
  const result = await provisionTrialAdmin(email, restaurant, {
    tables: profile.tables,
    branches: profile.branches,
    posSystem: profile.posSystem,
  });
  if (result.status === "created" && result.password && result.expiresAt) {
    const mail = await sendTrialCredentials({
      to: email,
      password: result.password,
      loginUrl: loginUrl(req),
      restaurant,
      expiresAt: result.expiresAt,
    });
    return NextResponse.json(
      { ok: true, status: "created", emailed: mail.ok },
      { status: 201 },
    );
  }

  // Email already has an account → point them at sales (never auto-renew).
  const mail = await sendContactSales({
    to: email,
    restaurant,
    salesEmail: SITE.salesEmail,
  });
  return NextResponse.json(
    { ok: true, status: "exists", emailed: mail.ok },
    { status: 201 },
  );
}

// Captured leads — super only.
export async function GET(req: Request) {
  const user = await authedUser(req);
  if (user?.role !== "super") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await listLeads());
}
