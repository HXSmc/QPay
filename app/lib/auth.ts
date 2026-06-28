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

// PBKDF2 work factor. 210k SHA-256 iterations ~ OWASP 2023 guidance; high
// enough to slow offline cracking, cheap enough for a serverless login.
const PBKDF2_ITERS = 210_000;
const HASH_BYTES = 32;
const SALT_BYTES = 16;

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

async function pbkdf2(password: string, salt: Uint8Array): Promise<Uint8Array> {
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
      iterations: PBKDF2_ITERS,
    },
    key,
    HASH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

/** Hash a password as `salt.digest` (both base64url). */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const digest = await pbkdf2(password, salt);
  return `${b64url(salt)}.${b64url(digest)}`;
}

/** Constant-time-verify a password against a stored `salt.digest`. */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const dot = stored.indexOf(".");
  if (dot <= 0) return false;
  let salt: Uint8Array;
  let want: Uint8Array;
  try {
    salt = fromB64url(stored.slice(0, dot));
    want = fromB64url(stored.slice(dot + 1));
  } catch {
    return false;
  }
  const got = await pbkdf2(password, salt);
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
}

/** Mint a signed session token for a user. */
export async function createSessionToken(
  sub: string,
  role: Role,
): Promise<string> {
  const payload = b64url(
    enc.encode(JSON.stringify({ sub, role, exp: Date.now() + TTL_MS })),
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
  const { sub, role, exp } = data as Record<string, unknown>;
  if (typeof sub !== "string" || !sub) return null;
  if (role !== "super" && role !== "admin") return null;
  if (typeof exp !== "number" || exp < Date.now()) return null;
  return { sub, role, exp };
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
