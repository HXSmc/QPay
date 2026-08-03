-- 2026-08-03: drop the public SELECT policy on the menus bucket. Public buckets
-- serve /object/public/<bucket>/<path> URLs WITHOUT any storage.objects SELECT
-- policy; the policy only added the ability to LIST every file in the bucket
-- (enumeration exposure, flagged by the Supabase security advisor
-- 0025_public_bucket_allows_listing). Diner QR menu loads are unaffected.
drop policy if exists "menus_public_read" on storage.objects;
