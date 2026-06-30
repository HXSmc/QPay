-- Manager tier: a 3-level hierarchy (super → manager → branch-admin).
-- Additive + idempotent. Safe to run more than once; the app degrades
-- gracefully before it lands (writeWithOptionalCols drops unknown columns).
--
-- Model
--   super    — site owner; provisions + edits MANAGER credentials, sets caps,
--              reads manager contact messages.
--   manager  — chain owner (was the old `admin` owner-account). Owns
--              tables/branches/menus/settings/transactions/orders keyed on its
--              id. Whole-chain dashboard + creates/edits branch-admin logins +
--              contacts super.
--   admin    — branch operator. `parent_id` = its manager, `branch_id` = the one
--              branch it manages. Sees only that branch's tables/orders/menu +
--              branch-scoped analytics.

-- 1) Accounts: hierarchy columns + the new role -----------------------------
alter table accounts add column if not exists parent_id uuid
  references accounts(id) on delete cascade;
-- branch_id CASCADEs (not set-null): deleting a branch must remove its operator
-- login, never orphan it. An orphaned branch-admin (branch_id NULL) would resolve
-- to an UNBRANCHED scope = chain-wide access (privilege escalation). authedUser
-- additionally fails closed on a null-branch admin as defence-in-depth.
alter table accounts add column if not exists branch_id uuid
  references branches(id) on delete cascade;

-- Widen the role check to include 'manager'.
alter table accounts drop constraint if exists accounts_role_check;
alter table accounts add constraint accounts_role_check
  check (role in ('super', 'manager', 'admin'));

create index if not exists accounts_parent_idx on accounts (parent_id);

-- Promote every existing owner-account (role 'admin', no parent) to 'manager'.
-- All current non-super accounts are chain owners, so this is the migration that
-- realises the new hierarchy. Brand-new branch-admins carry a parent_id and stay
-- role 'admin'.
update accounts set role = 'manager' where role = 'admin' and parent_id is null;

-- 2) Per-branch scoping: denormalised branch_id on the data tables -----------
-- Tables already carry branch_id (migration 0008). These denormalise the branch
-- onto the ledger / orders / menu so a branch-admin can be scoped without a join.
alter table transactions add column if not exists branch_id uuid
  references branches(id) on delete set null;
alter table orders add column if not exists branch_id uuid
  references branches(id) on delete set null;
alter table menu_items add column if not exists branch_id uuid
  references branches(id) on delete set null;
create index if not exists transactions_branch_idx on transactions (branch_id);
create index if not exists orders_branch_idx on orders (branch_id);
create index if not exists menu_items_branch_idx on menu_items (branch_id);

-- 3) Menus become per (owner, branch). The old single-owner PK only allowed one
-- menu row per owner; drop it so each branch can have its own uploaded menu.
-- branch_id null = the chain/default menu (pre-migration rows + manager default).
alter table menus add column if not exists branch_id uuid
  references branches(id) on delete cascade;
alter table menus drop constraint if exists menus_pkey;
create index if not exists menus_owner_idx on menus (owner);
-- UNIQUE per (owner, branch). Two partial indexes because NULL <> NULL in Postgres
-- (<15), so a single unique(owner, branch_id) would not dedup the chain/default
-- (null-branch) menu. These give setMenu a real upsert arbiter and guarantee
-- getMenu's maybeSingle() never sees duplicates (a concurrent double-upload merges
-- instead of inserting a second row).
create unique index if not exists menus_owner_branch_uidx
  on menus (owner, branch_id) where branch_id is not null;
create unique index if not exists menus_owner_chain_uidx
  on menus (owner) where branch_id is null;

-- 4) Contact channel: manager → super messages ------------------------------
create table if not exists manager_messages (
  id         uuid primary key default gen_random_uuid(),
  manager_id uuid not null references accounts(id) on delete cascade,
  subject    text not null default '',
  body       text not null default '',
  status     text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);
create index if not exists manager_messages_created_idx
  on manager_messages (created_at desc);
alter table manager_messages enable row level security;

-- 5) renew_admin now extends a manager OR a branch-admin (both can be trials) --
create or replace function renew_admin(p_id uuid, p_days int)
  returns setof accounts language sql as $$
  update accounts
    set expires_at = greatest(coalesce(expires_at, now()), now())
                     + make_interval(days => p_days)
    where id = p_id and role in ('manager', 'admin')
    returning *;
$$;

-- 6) commit_table_update also stamps the ledger row with the table's branch, so
-- branch-scoped revenue analytics need no join. p_txn->>'branch_id' is null on
-- the old code path (deploy window) — harmless.
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
    return false;
  end if;
  if p_txn is not null then
    insert into transactions (owner, table_num, time, amount, method, branch_id)
    values (
      (p_txn->>'owner')::uuid,
      (p_txn->>'table_num')::bigint,
      p_txn->>'time',
      p_txn->>'amount',
      p_txn->>'method',
      nullif(p_txn->>'branch_id', '')::uuid
    );
  end if;
  return true;
end;
$$;
