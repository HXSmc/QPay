import { NextResponse } from "next/server";
import { addLead, authedUser, listLeads, provisionTrialAdmin } from "@/app/lib/store";
import { isSameOrigin } from "@/app/lib/auth";
import { sendContactSales, sendTrialCredentials } from "@/app/lib/email";
import { SITE } from "@/app/lib/site";
import { allow, clientIp } from "@/app/lib/ratelimit";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Absolute /admin/login URL for the email link, derived from the request. */
function loginUrl(req: Request): string {
  try {
    const u = new URL(req.url);
    return `${u.protocol}//${u.host}/admin/login`;
  } catch {
    return "/admin/login";
  }
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
  };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const restaurant =
    typeof body.restaurant === "string" ? body.restaurant.trim() : "";
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

  // Always capture the marketing lead.
  await addLead({ name, email, restaurant });

  // Provision (or decline) the trial, then send the matching email.
  const result = await provisionTrialAdmin(email, restaurant);
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
