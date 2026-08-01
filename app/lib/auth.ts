// Real authentication primitives for Nuqra.
//
// Security-critical module. There are NO hardcoded login credentials here:
// accounts live in the store (app/lib/store.ts) and passwords are stored only
// as PBKDF2 digests. The session cookie is an HMAC-signed, expiring token that
// carries the user's id + role, so it can't be forged and the server can scope
// every request to the calling user's own data.
//
// All crypto uses the Web Crypto API (`crypto.subtle`) so the exact same code
// runs in both the Edge middleware and the Node route handlers.
import type { Role } from "./types";

export const AUTH_COOKIE = "qpay_admin";

const TTL_MS = 8 * 60 * 60 * 1000; // 8h, matches the cookie maxAge

// The HMAC signing key. In production it MUST come from the environment (fail
// closed). In dev/test, instead of a source-committed CONSTANT (which anyone
// reading the repo could use to forge an admin session), generate a random
// secret per process: dev sessions stay valid within a run but can't be forged
// from a known value, and they reset on restart.
let _devSecret: string | undefined;
function signingSecret(): string {
  const env = process.env.SESSION_SECRET;
  if (env) return env;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET must be set in production (refusing to sign sessions without a configured key)",
    );
  }
  if (!_devSecret) {
    _devSecret = b64url(crypto.getRandomValues(new Uint8Array(32)));
  }
  return _devSecret;
}

// PBKDF2 work factors (SHA-256). New hashes use 600k per the current OWASP
// Password Storage Cheat Sheet minimum for PBKDF2-HMAC-SHA256. Legacy hashes
// were minted at 210k with NO embedded iteration count (format `salt.digest`);
// verifyPassword treats a count-less hash as 210k so existing logins keep
// working, and the login path transparently rehashes them at 600k (see
// app/api/auth/login/route.ts).
const PBKDF2_ITERS = 600_000;
const PBKDF2_LEGACY_ITERS = 210_000;
const HASH_BYTES = 32;
const SALT_BYTES = 16;
// Upper bound on an embedded iteration count. verifyPassword already floors
// implausible counts (< 1000); this CEILS them so a planted `99999999.….…`
// hash can't turn each login into a multi-minute CPU burn (DoS).
const PBKDF2_MAX_ITERS = 1_000_000;

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  const bin = atob(b64 + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---------------------------------------------------------------------------
// Password hashing (PBKDF2-SHA256)
// ---------------------------------------------------------------------------

async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iters: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt as BufferSource,
      iterations: iters,
    },
    key,
    HASH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

/**
 * Hash a password as `iters.salt.digest` (all base64url except iters, a decimal
 * int). New hashes embed the work factor so it can be raised later without
 * invalidating existing digests.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const digest = await pbkdf2(password, salt, PBKDF2_ITERS);
  return `${PBKDF2_ITERS}.${b64url(salt)}.${b64url(digest)}`;
}

/**
 * A hash shaped EXACTLY like a real `iters.salt.digest` (same 3 parts and the
 * SAME base64url byte lengths — 16-byte salt, 32-byte digest) so verifyPassword
 * against it costs the current default work factor, closing the
 * account-enumeration timing oracle where a missing account once verified
 * (legacy 2-part dummy → 210k) faster than a present one (migrated → 600k).
 * Built from the real byte lengths + PBKDF2_ITERS, so a future iteration bump
 * re-derives the dummy automatically instead of silently re-opening the gap.
 * (The bytes are all-zero; it never verifies any real password — it just has to
 * decode to the right shape and cost the right iterations.)
 */
export function dummyPasswordHash(): string {
  return `${PBKDF2_ITERS}.${b64url(new Uint8Array(SALT_BYTES))}.${b64url(new Uint8Array(HASH_BYTES))}`;
}

/**
 * True for a legacy `salt.digest` hash (no embedded iteration count). Used by
 * the login path to trigger a transparent rehash at the current work factor.
 */
export function isLegacyPasswordHash(stored: string): boolean {
  return stored.split(".").length === 2;
}

/** Constant-time-verify a password against a stored hash.
 *  • `iters.salt.digest` (3-part) → uses the embedded iteration count.
 *  • `salt.digest`        (2-part) → legacy, verified at PBKDF2_LEGACY_ITERS. */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split(".");
  let iters: number;
  let saltB64: string;
  let digestB64: string;
  if (parts.length === 3 && /^\d+$/.test(parts[0])) {
    iters = Number(parts[0]);
    if (iters < 1000) return false; // sanity floor — reject implausible counts
    if (iters > PBKDF2_MAX_ITERS) return false; // ceiling — reject a planted huge value
    saltB64 = parts[1];
    digestB64 = parts[2];
  } else if (parts.length === 2) {
    // Legacy format: salt.digest, no embedded count → 210k.
    iters = PBKDF2_LEGACY_ITERS;
    saltB64 = parts[0];
    digestB64 = parts[1];
  } else {
    return false;
  }
  let salt: Uint8Array;
  let want: Uint8Array;
  try {
    salt = fromB64url(saltB64);
    want = fromB64url(digestB64);
  } catch {
    return false;
  }
  const got = await pbkdf2(password, salt, iters);
  return timingSafeEqualBytes(got, want);
}

// ---------------------------------------------------------------------------
// HMAC signing + constant-time compares
// ---------------------------------------------------------------------------

async function sign(data: string): Promise<string> {
  // signingSecret() resolves the env key (fail-closed in prod) lazily at request
  // time, so the build doesn't trip before the env is wired up.
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(signingSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return b64url(new Uint8Array(sig));
}

// Constant-time string compare (avoid early-exit timing leaks on the MAC).
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Session tokens — `payload.signature`, payload = b64url(JSON{sub,role,exp})
// ---------------------------------------------------------------------------

export interface Session {
  /** User id. */
  sub: string;
  role: Role;
  /** Expiry, ms epoch. */
  exp: number;
  /**
   * Password-binding fingerprint (optional for legacy tokens). Tokens minted at
   * login carry a short HMAC of the account's password hash; authedUser rejects
   * the token if it no longer matches, so a password reset revokes every
   * outstanding session immediately (real revocation on a stateless token).
   */
  pv?: string;
}

/**
 * Short, non-reversible fingerprint of a password hash, embedded in the session
 * so changing the password invalidates old tokens. It's an HMAC under the server
 * signing secret (not the raw hash), so the cookie never carries hash material.
 */
export async function passwordFingerprint(passwordHash: string): Promise<string> {
  return (await sign(`pv:${passwordHash}`)).slice(0, 16);
}

/** Mint a signed session token for a user. */
export async function createSessionToken(
  sub: string,
  role: Role,
  pv?: string,
): Promise<string> {
  const payload = b64url(
    enc.encode(JSON.stringify({ sub, role, exp: Date.now() + TTL_MS, ...(pv ? { pv } : {}) })),
  );
  return `${payload}.${await sign(payload)}`;
}

/** Decode + verify a token. Returns the session, or null if invalid/expired. */
export async function verifySession(
  token?: string | null,
): Promise<Session | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  // Verify the signature BEFORE trusting any payload bytes. sign() can throw in
  // a misconfigured prod (no SESSION_SECRET); treat that as an invalid session
  // (clean 401) rather than letting it crash middleware / API routes.
  let expected: string;
  try {
    expected = await sign(payload);
  } catch {
    return null;
  }
  if (!safeEqual(sig, expected)) return null;
  let data: unknown;
  try {
    data = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const { sub, role, exp, pv } = data as Record<string, unknown>;
  if (typeof sub !== "string" || !sub) return null;
  if (role !== "super" && role !== "manager" && role !== "admin") return null;
  if (typeof exp !== "number" || exp < Date.now()) return null;
  return { sub, role, exp, ...(typeof pv === "string" ? { pv } : {}) };
}

/** Constant-time equality for opaque tokens (e.g. the per-table capability). */
export function constantTimeEqual(a: string, b: string): boolean {
  return safeEqual(a, b);
}

/**
 * Lightweight CSRF defense for cookie-authenticated mutations: if an Origin
 * header is present it must match the request host. (Same-origin requests that
 * omit Origin are allowed; cross-site form posts that forge a cookie carry a
 * foreign Origin and are rejected.)
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const host = req.headers.get("host");
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq) === name) return part.slice(eq + 1);
  }
  return null;
}

/** Decode the session from an incoming Request (route handlers). */
export async function getSession(req: Request): Promise<Session | null> {
  return verifySession(readCookie(req.headers.get("cookie"), AUTH_COOKIE));
}

/** True iff the request carries any valid session (admin or super). */
export async function isAdminRequest(req: Request): Promise<boolean> {
  return (await getSession(req)) !== null;
}
