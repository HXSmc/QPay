import { NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  createSessionToken,
  hashPassword,
  isSameOrigin,
  passwordFingerprint,
  verifyPassword,
} from "@/app/lib/auth";
import { authedUser, setAccountPassword } from "@/app/lib/store";
import { clientIp, rateLimit } from "@/app/lib/ratelimit";

export const dynamic = "force-dynamic";

// Self-service password change for any signed-in account. Requires the current
// password, sets a new one, then re-mints THIS session's cookie with the new
// password fingerprint — so the caller stays logged in while every OTHER
// outstanding session is revoked (authedUser rejects the stale fingerprint).
export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!(await rateLimit("adminEdit", clientIp(req)))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    currentPassword?: unknown;
    newPassword?: unknown;
  };
  const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const next = typeof body.newPassword === "string" ? body.newPassword : "";

  if (next.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters." },
      { status: 400 },
    );
  }
  // Verify the current password before allowing the change (a stolen session
  // alone can't rotate the password without knowing the old one).
  if (!(await verifyPassword(current, user.passwordHash))) {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 403 },
    );
  }

  const newHash = await hashPassword(next);
  const ok = await setAccountPassword(user.id, newHash);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Re-mint this session's cookie with the new fingerprint so the caller isn't
  // logged out by their own change; all other sessions now fail the pv check.
  const res = NextResponse.json({ ok: true });
  const pv = await passwordFingerprint(newHash);
  res.cookies.set(AUTH_COOKIE, await createSessionToken(user.id, user.role, pv), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
