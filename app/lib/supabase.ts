// Lazily-created, memoized Supabase service-role client. Shared by the relational
// store backend. The client uses the service-role key (server-only) so it can
// read/write every row; never import this into client code.

import type { SupabaseClient } from "@supabase/supabase-js";

/** True when the relational Supabase backend is configured. */
export const useSupabase = !!process.env.SUPABASE_URL;

// createClient() wants the bare project URL (https://xxxx.supabase.co), but the
// dashboard also surfaces the REST endpoint (…/rest/v1/) and people paste that
// by mistake — which silently breaks every query. Strip any /rest/v1 suffix and
// trailing slash so either form works.
export function supabaseUrl(): string {
  const raw = (process.env.SUPABASE_URL ?? "").trim();
  return raw.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

let _sb: SupabaseClient | undefined;

export async function sb(): Promise<SupabaseClient> {
  if (!_sb) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
      // Misconfiguration: URL set but no service-role key. Fail loudly rather
      // than letting writes silently no-op (which looks like "state resets").
      throw new Error(
        "store: SUPABASE_URL is set but SUPABASE_SERVICE_ROLE_KEY is missing",
      );
    }
    const { createClient } = await import("@supabase/supabase-js");
    _sb = createClient(supabaseUrl(), key, {
      auth: { persistSession: false },
      global: {
        // Next.js patches global fetch and CACHES it by default — which would
        // serve STALE rows (expired sessions still valid, payments not seen).
        // Force every PostgREST request to bypass the Data Cache.
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: "no-store" }),
      },
    });
  }
  return _sb;
}

// --- Menu file storage (Supabase Storage bucket `menus`) --------------------
// Replaces Vercel Blob. Menu images/PDFs (PNG/JPEG/WEBP/GIF/PDF, ≤20 MB) are
// stored as objects under `<owner>/<uuid>.<ext>` in the public `menus` bucket.
// Writes use the service-role key (bypasses RLS) or signed upload URLs — never
// anon. The public URL is plain string construction (bucket is public), no API
// call. The pure helpers below have no SDK/env dependency; the REST helpers use
// raw fetch (keeps cache:'no-store', matching sb()'s no-cache trap).

export const MENUS_BUCKET = "menus";

/** MIME → extension for accepted menu file types (single source of truth). */
const MENU_MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

export const MENU_ALLOWED_MIME = Object.keys(MENU_MIME_EXT);
export const MENU_MAX_BYTES = 20 * 1024 * 1024; // 20 MB upload cap

/** Extension for an accepted MIME, or undefined if the type isn't allowed. */
export function menuExtForMime(mime: string): string | undefined {
  return MENU_MIME_EXT[mime];
}

/**
 * Storage object path inside bucket `menus`: `<owner>/<id>.<ext>`. `id` is a
 * caller-generated uuid (kept as a param so this is pure/deterministic and
 * unit-checkable; route.ts passes crypto.randomUUID()).
 */
export function menuStoragePath(owner: string, id: string, ext: string): string {
  return `${owner}/${id}.${ext}`;
}

/** Public read URL for a stored menu object (bucket is public — no API call). */
export function menuPublicUrl(storagePath: string): string {
  const encoded = storagePath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `${supabaseUrl()}/storage/v1/object/public/${MENUS_BUCKET}/${encoded}`;
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * True iff `storagePath` is exactly `<ownerId>/<uuid-v4>.<ext-for-mime>` — the
 * shape `menuStoragePath()` produces. The confirm endpoint MUST check this
 * (with ownerId taken from the authed session, never the request body) before
 * persisting a client-supplied path: without it, an authed owner can point the
 * path at another tenant's prefix and trigger a cross-tenant object delete via
 * `deleteMenuObject`, or via `../` segments. The extension/MIME match also
 * blocks storing a URL string that doesn't correspond to what was actually
 * uploaded.
 */
export function isValidMenuStoragePath(
  storagePath: string,
  ownerId: string,
  mime: string,
): boolean {
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

/**
 * Mint a signed upload URL (service role). Returns the FULL URL the client PUTs
 * file bytes to (with the file's content-type header). The server never proxies
 * the bytes — this is how uploads >4.5 MB bypass the serverless body limit.
 */
export async function signMenuUpload(storagePath: string): Promise<string> {
  const client = await sb();
  const { data, error } = await client.storage
    .from(MENUS_BUCKET)
    .createSignedUploadUrl(storagePath);
  if (error || !data) {
    throw new Error(`storage sign failed: ${error?.message ?? "unknown error"}`);
  }
  return data.signedUrl;
}

/** Server-side direct put (small-file multipart fallback, service role). */
export async function putMenuObject(
  storagePath: string,
  bytes: ArrayBuffer,
  mime: string,
): Promise<void> {
  const client = await sb();
  const { error } = await client.storage
    .from(MENUS_BUCKET)
    .upload(storagePath, bytes, { contentType: mime });
  if (error) throw new Error(`storage put failed: ${error.message}`);
}

/** Delete a stored menu object (service role). "not found" is treated as success. */
export async function deleteMenuObject(storagePath: string): Promise<void> {
  const client = await sb();
  const { error } = await client.storage.from(MENUS_BUCKET).remove([storagePath]);
  if (error && !/not.?found/i.test(error.message)) {
    throw new Error(`storage delete failed: ${error.message}`);
  }
}
