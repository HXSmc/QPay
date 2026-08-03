import { NextResponse } from "next/server";
import { AUTH_COOKIE, getSession, isSameOrigin } from "@/app/lib/auth";
import { revokeSession } from "@/app/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // CSRF: clearing the session is state-changing, so apply the same Origin check
  // as every other cookie-authed mutation (blocks cross-site forced logout).
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  // Revoke the session server-side BEFORE clearing the cookie. A captured
  // pre-logout cookie replayed later must now fail at authedUser (its jti is on
  // the denylist), not live out its 8h exp. Best-effort: a revoke write failure
  // must never block the cookie clear (logout still "works" for the caller).
  const session = await getSession(req);
  if (session?.jti) {
    await revokeSession(session.jti, session.exp).catch(() => {});
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
