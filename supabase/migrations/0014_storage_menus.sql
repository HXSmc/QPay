-- Menu file storage bucket (2026-08-03). Replaces Vercel Blob: menu images/PDFs
-- (PNG/JPEG/WEBP/GIF/PDF, <=20 MB) now live in Supabase Storage, public read.
-- Path scheme inside the bucket: `<owner>/<uuid>.<ext>`.
--
-- Idempotent + self-healing: re-applying converges to the intended config. The
-- bucket limits (allowed_mime_types + file_size_limit) ENFORCE the 20 MB / MIME
-- cap at the storage layer on the client-direct signed-upload path — the app
-- pre-checks on a client-reported size, but Supabase is the real authority.
--
-- Writes happen ONLY via the service_role key (bypasses RLS) or signed upload
-- URLs — there are intentionally NO anon INSERT/UPDATE/DELETE policies. The
-- bucket is public, so object URLs load menu images/PDFs over QR without
-- auth or any storage.objects SELECT policy (see below).

insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values (
  'menus',
  'menus',
  true,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'application/pdf'
  ],
  20971520 -- 20 MB
)
on conflict (id) do update
set
  public = excluded.public,
  allowed_mime_types = excluded.allowed_mime_types,
  file_size_limit = excluded.file_size_limit;

-- Intentionally NO storage.objects SELECT policy here: the bucket above is
-- `public = true`, which already serves object URLs (/object/public/menus/...)
-- to diners without any RLS policy. A broad `for select to public` policy on
-- storage.objects (as this migration once added) also enables LISTING every
-- object in the bucket, not just fetching known URLs — see 0015, which drops
-- that policy on the live DB (Supabase advisor lint 0025_public_bucket_allows_listing).
-- Do not re-add a SELECT policy for this bucket.

-- Intentionally NO insert/update/delete policies: writes go through the
-- service_role key (RLS-bypassing) or signed upload URLs, never anon.
