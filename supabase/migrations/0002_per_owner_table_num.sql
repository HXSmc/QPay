-- Per-owner table numbering. `num` is no longer the global PK; each owner counts
-- from 1 (admin A: 1,2 · admin B: 1). A surrogate `id uuid` becomes the PK, the
-- capability `token` becomes unique (public lookups resolve by token, since
-- `num` is now ambiguous across owners), and a per-owner counter allocates the
-- next number monotonically (never reused within an owner). Idempotent.

-- 1. Surrogate primary key ---------------------------------------------------
alter table tables add column if not exists id uuid not null default gen_random_uuid();

-- 2. Renumber existing rows per owner (1..n by current num/age) ---------------
with r as (
  select id, row_number() over (partition by owner order by num, created_at) rn
  from tables
)
update tables t set num = r.rn from r where t.id = r.id;

-- 3. Swap the primary key from num → id, add the new uniqueness rules ---------
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'tables_pkey') then
    alter table tables drop constraint tables_pkey;
  end if;
end $$;
alter table tables add primary key (id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tables_owner_num_key') then
    alter table tables add constraint tables_owner_num_key unique (owner, num);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tables_token_key') then
    alter table tables add constraint tables_token_key unique (token);
  end if;
end $$;

-- 4. Per-owner monotonic counter (replaces the global table_seq) --------------
create table if not exists owner_counters (
  owner uuid primary key references accounts(id) on delete cascade,
  seq   bigint not null default 0
);

-- Seed from any existing tables so the next number never collides.
insert into owner_counters (owner, seq)
  select owner, max(num) from tables group by owner
  on conflict (owner) do update set seq = greatest(owner_counters.seq, excluded.seq);

-- Atomic per-owner allocation: bump and return the new number.
create or replace function next_table_num(p_owner uuid) returns bigint
  language plpgsql as $$
declare n bigint;
begin
  insert into owner_counters (owner, seq) values (p_owner, 1)
    on conflict (owner) do update set seq = owner_counters.seq + 1
    returning seq into n;
  return n;
end;
$$;

-- Drop the old global allocator (no-arg overload) + its sequence.
drop function if exists next_table_num();
drop sequence if exists table_seq;
