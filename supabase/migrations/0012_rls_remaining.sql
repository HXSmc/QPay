-- Close the remaining RLS gap: 4 tables created before RLS became standard on
-- every table (see 0001_relational.sql) never had it enabled. No policies are
-- added, matching the rest of the schema's pattern (service role only; anon/
-- public gets zero access — the app talks to Postgres exclusively via the
-- service-role key, never anon).
-- `owner_counters` was created in 0002 and dropped again in 0003; it's included
-- here defensively (IF EXISTS) in case a live database still has it, without
-- aborting the rest of this script if it doesn't.
-- NOTE: must be applied manually in the Supabase dashboard SQL editor —
-- migrations here do not auto-run against prod.

alter table if exists owner_counters  enable row level security;
alter table if exists payment_intents enable row level security;
alter table if exists webhook_events  enable row level security;
alter table if exists branches        enable row level security;
