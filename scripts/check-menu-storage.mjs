// Self-check for the pure menu-storage logic introduced when swapping Vercel
// Blob → Supabase Storage (ponytail rule). Plain node, no framework, no deps.
// Mirrors app/lib/supabase.ts's pure helpers (menuExtForMime / menuStoragePath /
// menuPublicUrl / isValidMenuStoragePath + the MIME→ext map, allowed list, and
// 20 MB cap) EXACTLY — a divergence here is a signal to reconcile the two.
// Run: `node scripts/check-menu-storage.mjs`.
//
// Asserts (without needing live Supabase):
//   • every accepted MIME maps to the right extension; rejected MIMEs are undefined
//   • the 20 MB cap constant matches
//   • menuStoragePath builds `<owner>/<id>.<ext>` deterministically
//   • menuPublicUrl builds the public-read URL (segment-encoded) off SUPABASE_URL
//   • isValidMenuStoragePath (the confirm-endpoint security guard) accepts only
//     the authed owner's own `<uuid-v4>.<ext-for-mime>` path — rejects a foreign
//     owner prefix, `../` traversal, and a mismatched extension/MIME

import { createHmac } from "node:crypto";

const MENUS_BUCKET = "menus";

const MENU_MIME_EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

const MENU_ALLOWED_MIME = Object.keys(MENU_MIME_EXT);
const MENU_MAX_BYTES = 20 * 1024 * 1024;

function menuExtForMime(mime) {
  return MENU_MIME_EXT[mime];
}

function menuStoragePath(owner, id, ext) {
  return `${owner}/${id}.${ext}`;
}

function supabaseUrl() {
  const raw = (process.env.SUPABASE_URL ?? "").trim();
  return raw.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

function menuPublicUrl(storagePath) {
  const encoded = storagePath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `${supabaseUrl()}/storage/v1/object/public/${MENUS_BUCKET}/${encoded}`;
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidMenuStoragePath(storagePath, ownerId, mime) {
  const ext = menuExtForMime(mime);
  if (!ext) return false;
  const prefix = `${ownerId}/`;
  if (!storagePath.startsWith(prefix)) return false;
  const rest = storagePath.slice(prefix.length);
  const dot = rest.lastIndexOf(".");
  if (dot === -1) return false;
  const id = rest.slice(0, dot);
  const gotExt = rest.slice(dot + 1);
  return gotExt === ext && UUID_V4.test(id);
}

// --- Menu-path signature (mirrors app/lib/auth.ts signMenuPath/verifyMenuPathSig) ---
// HMAC-SHA256 over `menu:<storagePath>` under the session signing secret, base64url
// (no padding) — same transform auth.ts's `sign()` + `b64url()` produce. Used to bind
// the confirm path to one the server minted in a prior sign: a branch-admin shares
// its parent's owner prefix, so isValidMenuStoragePath alone can't stop it confirming
// another branch's object path. Only the server (holding SESSION_SECRET) can mint a
// valid sig. A divergence here from auth.ts is a signal to reconcile.
const TEST_SECRET = "test-session-secret";
function signMenuPath(storagePath, secret = TEST_SECRET) {
  return createHmac("sha256", secret).update(`menu:${storagePath}`).digest("base64url");
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function verifyMenuPathSig(storagePath, sig, secret = TEST_SECRET) {
  return safeEqual(signMenuPath(storagePath, secret), sig);
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

function main() {
  console.log("MIME → extension mapping (PNG/JPEG/WEBP/GIF/PDF only):");
  assert(menuExtForMime("image/png") === "png", "image/png → png");
  assert(menuExtForMime("image/jpeg") === "jpg", "image/jpeg → jpg");
  assert(menuExtForMime("image/webp") === "webp", "image/webp → webp");
  assert(menuExtForMime("image/gif") === "gif", "image/gif → gif");
  assert(menuExtForMime("application/pdf") === "pdf", "application/pdf → pdf");
  assert(menuExtForMime("image/heic") === undefined, "image/heic rejected (not allowed)");
  assert(menuExtForMime("text/html") === undefined, "text/html rejected (not allowed)");
  assert(menuExtForMime("image/svg+xml") === undefined, "image/svg+xml rejected (not allowed)");
  assert(
    MENU_ALLOWED_MIME.length === 5 &&
      MENU_ALLOWED_MIME.every((m) => menuExtForMime(m)),
    "allowed list has exactly the 5 accepted MIMEs",
  );

  console.log("20 MB upload cap constant:");
  assert(MENU_MAX_BYTES === 20971520, "cap is exactly 20 * 1024 * 1024 bytes");

  console.log("Storage path scheme <owner>/<id>.<ext> (deterministic):");
  assert(
    menuStoragePath("owner-abc", "11111111-2222-3333-4444-555555555555", "jpg") ===
      "owner-abc/11111111-2222-3333-4444-555555555555.jpg",
    "builds owner/id.ext with the caller-supplied id verbatim",
  );
  assert(
    menuStoragePath("o", "x", "pdf") === "o/x.pdf",
    "no extra separators or suffix",
  );

  console.log("Public URL construction (segment-encoded, off SUPABASE_URL):");
  process.env.SUPABASE_URL = "https://example.supabase.co";
  assert(
    menuPublicUrl("owner-abc/1111.jpg") ===
      "https://example.supabase.co/storage/v1/object/public/menus/owner-abc/1111.jpg",
    "builds .../object/public/menus/<path>",
  );
  // A path segment needing encoding is encoded per-segment; slashes preserved.
  assert(
    menuPublicUrl("own er/x.jpg") ===
      "https://example.supabase.co/storage/v1/object/public/menus/own%20er/x.jpg",
    "encodes each path segment (space → %20), keeps slashes",
  );
  // Trailing slash / REST-suffix on SUPABASE_URL is stripped (mirrors supabaseUrl()).
  process.env.SUPABASE_URL = "https://example.supabase.co/rest/v1/";
  assert(
    menuPublicUrl("o/x.png") ===
      "https://example.supabase.co/storage/v1/object/public/menus/o/x.png",
    "strips /rest/v1/ + trailing slash from SUPABASE_URL",
  );

  console.log("Confirm-endpoint path guard (isValidMenuStoragePath):");
  const ownerId = "owner-abc";
  const uuid = "2852280e-d299-4532-9c22-f2d34d689e5a";
  assert(
    isValidMenuStoragePath(`${ownerId}/${uuid}.jpg`, ownerId, "image/jpeg") === true,
    "own owner prefix + valid uuid-v4 + ext matching mime → accepted",
  );
  assert(
    isValidMenuStoragePath(`other-owner/${uuid}.jpg`, ownerId, "image/jpeg") === false,
    "foreign owner prefix (cross-tenant delete attempt) → rejected",
  );
  assert(
    isValidMenuStoragePath(`${ownerId}/../other-owner/${uuid}.jpg`, ownerId, "image/jpeg") ===
      false,
    "`../` traversal inside the owner prefix → rejected",
  );
  assert(
    isValidMenuStoragePath(`${ownerId}/${uuid}.png`, ownerId, "image/jpeg") === false,
    "extension mismatched with declared mime (png path, jpeg mime) → rejected",
  );
  assert(
    isValidMenuStoragePath(`${ownerId}/not-a-uuid.jpg`, ownerId, "image/jpeg") === false,
    "malformed uuid → rejected",
  );
  assert(
    isValidMenuStoragePath(`${ownerId}/${uuid}.exe`, ownerId, "application/x-msdownload") ===
      false,
    "disallowed mime (no ext mapping) → rejected",
  );

  console.log("persistMenu storage-reconcile chooser (route.ts) — deletes the");
  console.log("object the menus row does NOT point at, never the live one:");
  // Mirrors `current?.filename === meta.filename ? previous : meta` from
  // app/api/menu/route.ts's persistMenu. A divergence here is a signal to
  // reconcile the two — inverting that ternary deletes the LIVE object.
  function chooseOrphan(current, meta, previous) {
    return current?.filename === meta.filename ? previous : meta;
  }
  const meta = { filename: "owner/new.jpg" };
  const previous = { filename: "owner/old.jpg" };
  assert(
    chooseOrphan(meta, meta, previous) === previous,
    "won the race (row points at ours) → delete the replaced object",
  );
  assert(
    chooseOrphan({ filename: "owner/other.jpg" }, meta, previous) === meta,
    "lost the race (row points elsewhere) → delete our own upload",
  );
  assert(
    chooseOrphan(null, meta, previous) === meta,
    "row is null (deleted mid-flight, SUCCESSFUL read) → delete our own upload, no resurrection",
  );
  // NOTE: null here means a successful read that found no row — route.ts wraps
  // the real getMenu call in try/catch and skips reconcile entirely on a
  // FAILED read (never coerces the error to null, which would hit this same
  // branch and delete the live object instead of a leaked one).

  console.log("Confirm-endpoint path signature (binds confirm to a server-minted");
  console.log("path — stops a branch-admin confirming/deleting another branch's object):");
  const ownerA = "manager-1";
  const ownerB = "manager-2";
  const branchAPath = `${ownerA}/${uuid}.jpg`;
  const branchBPath = `${ownerB}/${uuid}.jpg`;
  const sigA = signMenuPath(branchAPath);
  assert(
    verifyMenuPathSig(branchAPath, sigA) === true,
    "server-minted sig verifies against its own path",
  );
  assert(
    verifyMenuPathSig(branchAPath, signMenuPath(branchBPath)) === false,
    "sig for branch B's path does NOT verify for branch A's path (cross-branch confirm rejected)",
  );
  assert(
    verifyMenuPathSig(`${ownerA}/${uuid}.png`, sigA) === false,
    "path tampered after signing (jpg→png) → rejected",
  );
  assert(
    verifyMenuPathSig(branchAPath, "forged-by-attacker") === false,
    "a sig the server did not mint (forgery) → rejected",
  );
  assert(
    verifyMenuPathSig(branchAPath, signMenuPath(branchAPath, "wrong-secret")) === false,
    "sig minted under a different secret → rejected",
  );
  // A branch-admin's scope.ownerId is its parent manager id, so both branches in
  // a chain share one owner prefix — the sig is the ONLY thing distinguishing
  // them (isValidMenuStoragePath accepts BOTH under the shared prefix).
  assert(
    isValidMenuStoragePath(branchBPath, ownerA, "image/jpeg") === false &&
      isValidMenuStoragePath(branchBPath, ownerB, "image/jpeg") === true,
    "defence-in-depth: isValidMenuStoragePath still rejects a foreign owner prefix",
  );

  console.log(process.exitCode ? "\nFAIL" : "\nOK");
}

main();
