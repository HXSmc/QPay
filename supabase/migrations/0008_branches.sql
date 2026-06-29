-- Multi-branch support. Additive and idempotent.
--
-- A branch belongs to one admin; tables reference their branch. Accounts with a
-- single branch never see the branch UI. The app degrades gracefully before
-- this runs: listBranches() returns a synthetic default branch if this table is
-- absent, and createTable() retries without branch_id if that column is missing.

create table if not exists branches (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references accounts(id) on delete cascade,
  name        text not null default 'Main',
  external_id text not null default '',
  pos_system  text not null default '',
  -- Per-branch POS config; SECRET fields are stored as ciphertext (see
  -- app/lib/pos-secrets.ts), non-secret fields as plaintext.
  pos_config  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists branches_owner_idx on branches(owner);

-- Tables get an optional branch reference (null = the account's default branch).
alter table tables
  add column if not exists branch_id uuid references branches(id) on delete set null;

create index if not exists tables_branch_idx on tables(branch_id);
