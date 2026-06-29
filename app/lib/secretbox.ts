// Symmetric encryption-at-rest for sensitive integration secrets (POS API
// tokens/keys), mirroring the intent of the payments `payout_iban_enc` column:
// secrets are never stored in plaintext. AES-256-GCM via the Web Crypto API
// (same runtime story as auth.ts — works in Edge + Node).
//
// Key source: env `POS_ENC_KEY` if set (lets you rotate POS secrets
// independently); otherwise it falls back to `SESSION_SECRET` (already required
// in production), so encryption works in prod with no extra configuration. Any
// string works — it's hashed to a 32-byte AES key. Fail-closed in production
// if NEITHER is set. In dev a random per-process key is used (so secrets
// round-trip within a run, never committed to the repo) — restart rotates it.
//
// Ciphertext format: base64url("v1." + iv(12) + ciphertext+tag), all packed.

const enc = new TextEncoder();
const dec = new TextDecoder();

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

let _devKey: string | undefined;
function keyMaterial(): string {
  // Prefer a dedicated POS key; fall back to SESSION_SECRET (always set in prod).
  const env = process.env.POS_ENC_KEY || process.env.SESSION_SECRET;
  if (env) return env;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "POS_ENC_KEY or SESSION_SECRET must be set in production (refusing to store integration secrets without a configured key)",
    );
  }
  if (!_devKey) _devKey = b64url(crypto.getRandomValues(new Uint8Array(32)));
  return _devKey;
}

let _cryptoKey: Promise<CryptoKey> | null = null;
let _cachedFor: string | undefined;
async function aesKey(): Promise<CryptoKey> {
  const material = keyMaterial();
  if (_cryptoKey && _cachedFor === material) return _cryptoKey;
  _cachedFor = material;
  // Hash the key material to exactly 32 bytes so any-length env value works.
  _cryptoKey = (async () => {
    const digest = await crypto.subtle.digest("SHA-256", enc.encode(material));
    return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
      "encrypt",
      "decrypt",
    ]);
  })();
  return _cryptoKey;
}

// Ciphertext marker. Leads with a control char so it CANNOT collide with a real
// printable secret/token (the old "v1." prefix could — a token literally starting
// "v1." was mis-detected as ciphertext, stored plaintext, then wiped on read).
const PREFIX = "nqenc1.";
const LEGACY_PREFIX = "v1.";
// iv(12) + GCM tag(16) = 28 bytes minimum for a genuine ciphertext.
const MIN_CT_BYTES = 28;

/** True if `s` decodes as base64url to at least one full iv+tag (our ciphertext). */
function looksLikeCiphertext(body: string): boolean {
  try {
    return fromB64url(body).length >= MIN_CT_BYTES;
  } catch {
    return false;
  }
}

/** Encrypt a UTF-8 string. Returns a self-describing base64url token. */
export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await aesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext)),
  );
  const packed = new Uint8Array(iv.length + ct.length);
  packed.set(iv, 0);
  packed.set(ct, iv.length);
  return PREFIX + b64url(packed);
}

/** Decrypt a token from {@link encryptSecret}. Returns null on any failure.
 *  Accepts the current prefix and the legacy "v1." prefix (migration window). */
export async function decryptSecret(token: string): Promise<string | null> {
  try {
    let body: string | null = null;
    if (token.startsWith(PREFIX)) body = token.slice(PREFIX.length);
    else if (token.startsWith(LEGACY_PREFIX)) body = token.slice(LEGACY_PREFIX.length);
    if (body === null) return null;
    const packed = fromB64url(body);
    const iv = packed.slice(0, 12);
    const ct = packed.slice(12);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await aesKey(), ct);
    return dec.decode(pt);
  } catch {
    return null;
  }
}

/** True if `s` is one of our ciphertext tokens. The legacy "v1." prefix is only
 *  treated as ciphertext when the body actually decodes to a full iv+tag, so a
 *  plaintext secret like "v1.mytoken" is NOT mis-detected (it gets encrypted). */
export function isEncrypted(s: unknown): s is string {
  if (typeof s !== "string") return false;
  if (s.startsWith(PREFIX)) return true;
  return s.startsWith(LEGACY_PREFIX) && looksLikeCiphertext(s.slice(LEGACY_PREFIX.length));
}
