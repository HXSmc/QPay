// Mock prototype auth — hardcoded demo credentials, no user DB.
// The session cookie is an HMAC-signed, expiring token (not a guessable
// constant), so it can't be forged by simply setting `qpay_admin=1`. All crypto
// uses the Web Crypto API (`crypto.subtle`) so the same code runs in both the
// Edge middleware and Node route handlers.
export const DEMO_EMAIL = "admin@qpay.com";
export const DEMO_PASSWORD = "demo1234";
export const AUTH_COOKIE = "qpay_admin";

const TTL_MS = 8 * 60 * 60 * 1000; // 8h, matches the cookie maxAge
// Set SESSION_SECRET in the environment for real signing; the fallback only
// keeps local dev working and should be overridden in any shared deployment.
const SECRET = process.env.SESSION_SECRET || "qpay-dev-secret-change-me";

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
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

/** Mint a signed `exp.signature` session token. */
export async function createSessionToken(): Promise<string> {
  const exp = String(Date.now() + TTL_MS);
  return `${exp}.${await sign(exp)}`;
}

/** True iff the token is well-formed, unexpired, and the signature verifies. */
export async function verifySessionToken(
  token?: string | null,
): Promise<boolean> {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await sign(exp));
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq) === name) return part.slice(eq + 1);
  }
  return null;
}

/** Verify the admin session cookie on an incoming Request (route handlers). */
export async function isAdminRequest(req: Request): Promise<boolean> {
  const token = readCookie(req.headers.get("cookie"), AUTH_COOKIE);
  return verifySessionToken(token);
}
