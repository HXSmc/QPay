// Self-check for the versioned PBKDF2 hash logic (ponytail rule). Plain node,
// no framework, no deps — uses the global Web Crypto (crypto.subtle) exactly like
// app/lib/auth.ts. Mirrors that module's parse/format/verify rules; a divergence
// here is a signal to reconcile the two. Run: `node scripts/check-auth-hash.mjs`.
//
// Asserts:
//   • a 3-part (iters.salt.digest) hash round-trips and verifies
//   • a legacy 2-part (salt.digest) hash still verifies (at the legacy count)
//   • an iters value ABOVE the ceiling (>1_000_000) fails CLOSED (no CPU burn)
//   • an iters value BELOW the floor (<1000) fails CLOSED
//   • the dummy hash has the SAME part count + base64url byte lengths as a real hash

const PBKDF2_ITERS = 600_000;
const PBKDF2_LEGACY_ITERS = 210_000;
const HASH_BYTES = 32;
const SALT_BYTES = 16;
const PBKDF2_MAX_ITERS = 1_000_000;

const enc = new TextEncoder();

function b64url(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  const bin = atob(b64 + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pbkdf2(password, salt, iters) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: iters },
    key,
    HASH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const digest = await pbkdf2(password, salt, PBKDF2_ITERS);
  return `${PBKDF2_ITERS}.${b64url(salt)}.${b64url(digest)}`;
}

function dummyPasswordHash() {
  return `${PBKDF2_ITERS}.${b64url(new Uint8Array(SALT_BYTES))}.${b64url(new Uint8Array(HASH_BYTES))}`;
}

function timingSafeEqualBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// Mirrors app/lib/auth.ts verifyPassword EXACTLY (incl. floor + ceiling).
async function verifyPassword(password, stored) {
  const parts = stored.split(".");
  let iters, saltB64, digestB64;
  if (parts.length === 3 && /^\d+$/.test(parts[0])) {
    iters = Number(parts[0]);
    if (iters < 1000) return false; // sanity floor
    if (iters > PBKDF2_MAX_ITERS) return false; // ceiling — reject a planted huge value
    saltB64 = parts[1];
    digestB64 = parts[2];
  } else if (parts.length === 2) {
    iters = PBKDF2_LEGACY_ITERS;
    saltB64 = parts[0];
    digestB64 = parts[1];
  } else {
    return false;
  }
  let salt, want;
  try {
    salt = fromB64url(saltB64);
    want = fromB64url(digestB64);
  } catch {
    return false;
  }
  const got = await pbkdf2(password, salt, iters);
  return timingSafeEqualBytes(got, want);
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`  ❌ ${msg}`);
    process.exitCode = 1;
    return false;
  }
  console.log(`  ✅ ${msg}`);
  return true;
}

async function main() {
  const pw = "correct horse battery staple";

  console.log("3-part (iters.salt.digest) round-trip:");
  const h3 = await hashPassword(pw);
  assert(await verifyPassword(pw, h3), "valid password verifies against 3-part hash");
  assert(!(await verifyPassword("wrong", h3)), "wrong password is rejected");
  assert(h3.split(".").length === 3, "hash has 3 parts");

  console.log("Legacy 2-part (salt.digest) still verifies:");
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const legacy = `${b64url(salt)}.${b64url(await pbkdf2(pw, salt, PBKDF2_LEGACY_ITERS))}`;
  assert(await verifyPassword(pw, legacy), "valid password verifies against legacy 2-part hash");
  assert(legacy.split(".").length === 2, "legacy hash has 2 parts");

  console.log("Bounds fail closed (no multi-minute CPU burn):");
  const overCeil = `${PBKDF2_MAX_ITERS + 1}.${b64url(salt)}.${b64url(await pbkdf2(pw, salt, 1000))}`;
  assert(!(await verifyPassword(pw, overCeil)), "iters above ceiling (1_000_001) rejected without hashing");
  const underFloor = `500.${b64url(salt)}.${b64url(await pbkdf2(pw, salt, 1000))}`;
  assert(!(await verifyPassword(pw, underFloor)), "iters below floor (500) rejected");

  console.log("Dummy matches a real hash's shape:");
  const dummy = dummyPasswordHash();
  const real = h3;
  const dp = dummy.split(".");
  const rp = real.split(".");
  assert(dp.length === 3, "dummy has 3 parts (same as a real hash)");
  assert(dp.length === rp.length, "dummy part count matches real hash");
  assert(fromB64url(dp[1]).length === fromB64url(rp[1]).length, "dummy salt byte length matches real salt (16)");
  assert(fromB64url(dp[2]).length === fromB64url(rp[2]).length, "dummy digest byte length matches real digest (32)");
  assert(Number(dp[0]) === PBKDF2_ITERS, "dummy carries the current default work factor (600k)");
  assert(!(await verifyPassword(pw, dummy)), "dummy never verifies a real password");

  console.log(process.exitCode ? "\nFAIL" : "\nOK");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
