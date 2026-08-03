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

  console.log(process.exitCode ? "\nFAIL" : "\nOK");
}

main();
