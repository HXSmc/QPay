-- 2026-08-03: Supabase security-advisor hardening.
-- 1) Pin search_path on the four flagged functions (mutable search_path WARN).
--    Values match how the app calls them (unqualified public-schema objects).
alter function public.renew_admin(p_id uuid, p_days integer) set search_path = public, pg_catalog;
alter function public.commit_table_update(p_id uuid, p_expected_version bigint, p_status text, p_amount text, p_items jsonb, p_paid numeric, p_paid_qty jsonb, p_reservations jsonb, p_txn jsonb) set search_path = public, pg_catalog;
alter function public.next_table_num(p_owner uuid) set search_path = public, pg_catalog;
alter function public.record_login_failure(p_key text, p_now bigint, p_window_ms bigint, p_lock_ms bigint, p_max integer) set search_path = public, pg_catalog;

-- 2) rls_auto_enable is an event-trigger-only SECURITY DEFINER function; it has
--    no business being callable via /rest/v1/rpc by anon/authenticated (advisor
--    WARNs 0028/0029). Revoke all non-owner EXECUTE.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
