-- Close the RLS gap from secure.md F1 (2026-08-01). Four tables were created
-- without `enable row level security`, so Supabase's default anon-role table
-- privileges applied and the PostgREST endpoint (internet-reachable by default)
-- allowed anon-key CRUD on them. Enabling RLS with NO policy makes them
-- deny-by-default to anon/public, matching the other 10 tables; the app keeps
-- working unchanged because it connects only via the service_role key, which
-- bypasses RLS. Additive and idempotent (re-enabling RLS is a no-op).

alter table branches         enable row level security;
alter table owner_counters   enable row level security;
alter table payment_intents  enable row level security;
alter table webhook_events   enable row level security;
