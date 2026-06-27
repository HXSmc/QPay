import { NextResponse } from "next/server";
import { AUTH_COOKIE, isSameOrigin } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // CSRF: clearing the session is state-changing, so apply the same Origin check
  // as every other cookie-authed mutation (blocks cross-site forced logout).
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
