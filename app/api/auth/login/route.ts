import { NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  createSessionToken,
  dummyPasswordHash,
  hashPassword,
  isLegacyPasswordHash,
  isSameOrigin,
  passwordFingerprint,
  verifyPassword,
} from "@/app/lib/auth";
import {
  clearLoginFailures,
  findUserByEmail,
  getUserById,
  isLoginLocked,
  logSecurityEvent,
  recordLoginFailure,
  setAccountPassword,
} from "@/app/lib/store";
import { clientIp, LIMITS, rateLimit } from "@/app/lib/ratelimit";

export const dynamic = "force-dynamic";

// ponytail: only log the FIRST rate-limit rejection / lock hit per bucket per
// window — each log is a Supabase INSERT, so logging every over-limit request
// would make the cheap shed-load path the most expensive one. In-memory seen-set
// keyed on the bucket with the same TTL as the limit window.
// LIMITATION: serverless per-instance memory — each cold instance logs its own
// "first", so a flood across many warm instances can still write up to ~N rows
// (N = warm instances), but NEVER one-per-request. No dependency added.
const loggedFirst = new Map<string, number>();
function firstInWindow(key: string, ttlMs: number): boolean {
  const now = Date.now();
  const exp = loggedFirst.get(key);
  if (exp !== undefined && exp > now) return false; // already logged this window
  loggedFirst.set(key, now + ttlMs);
  // Opportunistic sweep so the map can't grow unbounded on a long-lived instance.
  if (loggedFirst.size > 1024) {
    for (const [k, e] of loggedFirst) if (e <= now) loggedFirst.delete(k);
  }
  return true;
}

// Shape-check the login_failed `actor` (the raw email-field value). Users
// sometimes paste a PASSWORD into the email field; logging that would persist a
// secret — drop it unless it still looks like an email. (logSecurityEvent caps
// every actor to 200 at the choke point.)
function loginActor(email: string): string | undefined {
  return /^\S+@\S+\.\S+$/.test(email) ? email : undefined;
}

// Matches the store's lock window (LOGIN_LOCK_MS = 15min) — the whole time an
// account stays locked we want just ONE login_locked row, not one per request.
const LOCK_DEDUP_MS = 15 * 60 * 1000;

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
    if (firstInWindow(`rl|${ip}`, LIMITS.login.windowMs)) {
      logSecurityEvent("rate_limit_rejected", { actor: email || undefined, ip, meta: { limit: "login" } });
    }
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
    if (firstInWindow(`lock|${email || ip}`, LOCK_DEDUP_MS)) {
      logSecurityEvent("login_locked", { actor: email || undefined, ip });
    }
    return NextResponse.json(
      { error: "too many attempts, try again later" },
      { status: 429 },
    );
  }

  const user = email ? await findUserByEmail(email) : null;
  // Always run a verify (against the stored hash, or a dummy) so the response
  // time doesn't reveal whether the email exists. The dummy is derived from the
  // SAME constants as a real hash (iters + 16-byte salt + 32-byte digest), so it
  // costs the current default work factor — and a future iteration bump re-
  // derives it automatically instead of silently re-opening a timing oracle.
  const ok = await verifyPassword(password, user?.passwordHash ?? dummyPasswordHash());

  if (!user || !ok) {
    await recordLoginFailure(key);
    if (email) await recordLoginFailure(email, EMAIL_MAX_FAILS);
    logSecurityEvent("login_failed", { actor: loginActor(email), ip });
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

  // Transparent PBKDF2 upgrade: a successful login against a LEGACY 2-part hash
  // (`salt.digest`, 210k, no embedded count) rehashes the password at the
  // current 600k work factor and persists it via the shared store update path.
  // Best-effort — a persist failure must NOT fail the login.
  //
  // ORDERING (password-bound session revocation): the session's `pv` fingerprint
  // is HMAC("pv:"+passwordHash). A legacy hash and its 600k rehash are DIFFERENT
  // strings → DIFFERENT fingerprints. authedUser re-reads the account from the
  // store and recomputes the fingerprint against whatever is PERSISTED, so the
  // session MUST be minted AFTER the rehash with pv = fingerprint(newHash). Mint
  // pv from the rehash result when it succeeded, else from the stored hash.
  let bindingHash = user.passwordHash;
  if (isLegacyPasswordHash(user.passwordHash)) {
    try {
      const rehashed = await hashPassword(password);
      // Guard the rehash on the hash we READ: if a superadmin password reset
      // landed during the ~120ms hashPassword window, the stored hash no longer
      // matches `user.passwordHash` and we must NOT overwrite the reset with a
      // rehash of the OLD password. setAccountPassword returns false on the
      // mismatch → bindingHash stays as the hash read at login (login still
      // succeeds; the session binds to that and is revoked by authedUser once it
      // re-reads the reset hash). Optional guard — other callers are unaffected.
      if (await setAccountPassword(user.id, rehashed, user.passwordHash)) bindingHash = rehashed;
    } catch (e) {
      console.warn(
        "login: legacy hash rehash failed (non-fatal):",
        e instanceof Error ? e.message : e,
      );
    }
  }

  const res = NextResponse.json({ ok: true, role: user.role });
  const pv = await passwordFingerprint(bindingHash);
  res.cookies.set(AUTH_COOKIE, await createSessionToken(user.id, user.role, pv), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
