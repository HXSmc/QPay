import { NextResponse } from "next/server";
import { AUTH_COOKIE, createSessionToken, verifyPassword } from "@/app/lib/auth";
import {
  clearLoginFailures,
  findUserByEmail,
  isLoginLocked,
  recordLoginFailure,
} from "@/app/lib/store";
import { clientIp } from "@/app/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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
  // session (authedUser would reject it anyway). Clear the fail counter first so
  // a valid-but-expired login isn't also counted toward lockout.
  if (user.expiresAt && new Date(user.expiresAt).getTime() <= Date.now()) {
    await clearLoginFailures(key);
    return NextResponse.json(
      { error: "your trial has expired — contact sales to renew" },
      { status: 403 },
    );
  }

  await clearLoginFailures(key);
  const res = NextResponse.json({ ok: true, role: user.role });
  res.cookies.set(AUTH_COOKIE, await createSessionToken(user.id, user.role), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
