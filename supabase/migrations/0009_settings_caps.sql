-- Super-only caps on tables/branches per account. Additive + idempotent.
-- The app reads settings via select("*") (absent column → undefined → unlimited)
-- and writes via writeWithOptionalCols (drops unknown columns + retries), so
-- deploying the app before this migration is safe — caps just don't persist yet.

alter table settings add column if not exists max_tables   integer;
alter table settings add column if not exists max_branches integer;
