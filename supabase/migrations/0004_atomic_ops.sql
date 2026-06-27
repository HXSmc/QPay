-- Atomic operations that close lost-update / partial-write races found in the
-- bug hunt. All idempotent (create or replace).

-- (1) Payment integrity: apply the table CAS update AND insert the ledger row in
-- ONE transaction, so a committed payment can never be missing its transaction
-- record (previously the UPDATE and the txn INSERT were separate calls — a failed
-- insert left paid money with no ledger entry, and a retry saw applied=0).
create or replace function commit_table_update(
  p_id uuid,
  p_expected_version bigint,
  p_status text,
  p_amount text,
  p_items jsonb,
  p_paid numeric,
  p_paid_qty jsonb,
  p_reservations jsonb,
  p_txn jsonb default null
) returns boolean language plpgsql as $$
declare updated int;
begin
  update tables set
    status = p_status, amount = p_amount, items = p_items, paid = p_paid,
    paid_qty = p_paid_qty, reservations = p_reservations,
    version = p_expected_version + 1
  where id = p_id and version = p_expected_version;
  get diagnostics updated = row_count;
  if updated = 0 then
    return false;  -- lost the CAS; caller re-reads + retries
  end if;
  if p_txn is not null then
    insert into transactions (owner, table_num, time, amount, method)
    values (
      (p_txn->>'owner')::uuid,
      (p_txn->>'table_num')::bigint,
      p_txn->>'time',
      p_txn->>'amount',
      p_txn->>'method'
    );
  end if;
  return true;
end;
$$;

-- (2) Admin renewal: extend from max(now, current expiry) in a single atomic
-- UPDATE so two concurrent renewals can't lose each other's extension.
create or replace function renew_admin(p_id uuid, p_days int)
  returns setof accounts language sql as $$
  update accounts
    set expires_at = greatest(coalesce(expires_at, now()), now())
                     + make_interval(days => p_days)
    where id = p_id and role = 'admin'
    returning *;
$$;

-- (3) Login throttle: increment the failure counter under the row lock taken by
-- INSERT ... ON CONFLICT, so concurrent failed logins can't undercount and slip
-- past the lockout threshold. `p_now` is the app's clock (ms epoch) so it agrees
-- with isLoginLocked.
create or replace function record_login_failure(
  p_key text, p_now bigint, p_window_ms bigint, p_lock_ms bigint, p_max int
) returns void language plpgsql as $$
begin
  delete from login_attempts where locked_until <= p_now and window_end <= p_now;
  insert into login_attempts (key, fails, window_end, locked_until)
    values (p_key, 1, p_now + p_window_ms,
            case when 1 >= p_max then p_now + p_lock_ms else 0 end)
  on conflict (key) do update set
    fails = case when p_now < login_attempts.window_end
                 then login_attempts.fails + 1 else 1 end,
    window_end = case when p_now < login_attempts.window_end
                      then login_attempts.window_end else p_now + p_window_ms end,
    locked_until = case
      when (case when p_now < login_attempts.window_end
                 then login_attempts.fails + 1 else 1 end) >= p_max
      then p_now + p_lock_ms else 0 end;
end;
$$;
