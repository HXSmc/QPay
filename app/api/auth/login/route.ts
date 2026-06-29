import { NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  createSessionToken,
  isSameOrigin,
  passwordFingerprint,
  verifyPassword,
} from "@/app/lib/auth";
import {
  clearLoginFailures,
  findUserByEmail,
  isLoginLocked,
  recordLoginFailure,
} from "@/app/lib/store";
import { clientIp } from "@/app/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // CSRF: reject cross-origin logins so a malicious site can't silently sign a
  // victim's browser into an attacker-controlled session (login CSRF). Mirrors
  // the Origin check on every other cookie-mutating route (logout, settings...).
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };
  const email = (typeof body.email === "string" ? body.email : "")
    .trim()
    .toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const key = `${email}|${clientIp(req)}`;

  // Throttle brute-force / credential-stuffing: refuse once locked out.
  if (await isLoginLocked(key)) {
    return NextResponse.json(
      { error: "too many attempts, try again later" },
      { status: 429 },
    );
  }

  const user = email ? await findUserByEmail(email) : null;
  // Always run a verify (against the stored hash, or a dummy) so the response
  // time doesn't reveal whether the email exists. The dummy must decode to the
  // SAME shape as a real hash — 16-byte salt (22 b64url chars) + 32-byte digest
  // (43 b64url chars) — or the byte-length mismatch makes timingSafeEqualBytes
  // return early, leaking (via timing) that no account matched.
  const DUMMY =
    "AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY);

  if (!user || !ok) {
    await recordLoginFailure(key);
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  // Trial lapsed: correct password, but the account has expired. Don't mint a
  // session (authedUser would reject it anyway). Return the SAME generic 401 as a
  // bad password so the response can't be used as an oracle to learn an account's
  // expiry status. (Expiry is communicated out-of-band via the trial email; the
  // superadmin sees/renews it.) Clear the fail counter so a valid-but-expired
  // login isn't counted toward lockout.
  if (user.expiresAt && new Date(user.expiresAt).getTime() <= Date.now()) {
    await clearLoginFailures(key);
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  await clearLoginFailures(key);
  const res = NextResponse.json({ ok: true, role: user.role });
  const pv = await passwordFingerprint(user.passwordHash);
  res.cookies.set(AUTH_COOKIE, await createSessionToken(user.id, user.role, pv), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
