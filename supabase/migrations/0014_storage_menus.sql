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
-- public SELECT policy lets diners load menu URLs over QR without auth.

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

-- Public read: anyone (anon/public) may SELECT objects in the menus bucket.
drop policy if exists "menus_public_read" on storage.objects;
create policy "menus_public_read" on storage.objects
  for select
  to public
  using (bucket_id = 'menus');

-- Intentionally NO insert/update/delete policies: writes go through the
-- service_role key (RLS-bypassing) or signed upload URLs, never anon.
