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
  getUserById,
  isLoginLocked,
  recordLoginFailure,
} from "@/app/lib/store";
import { clientIp, rateLimit } from "@/app/lib/ratelimit";

export const dynamic = "force-dynamic";

// A single account locks after this many failures across ALL source IPs within
// the store's lockout window. Higher than the per-(email,ip) threshold (8) so a
// legitimate user fumbling from one IP hits the strict per-IP lock first, while a
// DISTRIBUTED brute-force spread over many IPs still trips this global cap.
const EMAIL_MAX_FAILS = 30;

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
  const ip = clientIp(req);
  const key = `${email}|${ip}`;

  // Cap total login attempts per source IP regardless of which email is tried.
  // Without this, a single IP could password-spray one common password across
  // thousands of distinct emails — every per-(email,ip) counter stays at 1 and
  // never locks, so the whole user table would be probeable unthrottled.
  if (!(await rateLimit("login", ip))) {
    return NextResponse.json(
      { error: "too many attempts, try again later" },
      { status: 429 },
    );
  }

  // Throttle brute-force / credential-stuffing: refuse once locked out. Two
  // counters — the strict per-(email,ip) lock (8) for the common single-source
  // case, and an email-only global lock (EMAIL_MAX_FAILS) that also catches a
  // brute-force DISTRIBUTED across many IPs at one target account.
  if (await isLoginLocked(key) || (email && (await isLoginLocked(email)))) {
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
    if (email) await recordLoginFailure(email, EMAIL_MAX_FAILS);
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
    if (email) await clearLoginFailures(email);
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  // A branch-admin inherits its chain manager's lifecycle: deny the login if it's
  // orphaned (no branch) or its parent manager is missing / not a manager /
  // expired. Otherwise a lapsed chain could keep operating via its staff logins.
  // Same generic 401 so it can't be used as an expiry oracle.
  if (user.role === "admin") {
    const parent = user.parentId ? await getUserById(user.parentId) : null;
    const parentExpired =
      !parent ||
      parent.role !== "manager" ||
      (!!parent.expiresAt && new Date(parent.expiresAt).getTime() <= Date.now());
    if (!user.branchId || parentExpired) {
      await clearLoginFailures(key);
      return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
    }
  }

  await clearLoginFailures(key);
  if (email) await clearLoginFailures(email);
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
