-- QPay relational schema (replaces the single qpay:store jsonb blob).
-- Idempotent: safe to run more than once. RLS is enabled with no policies so the
-- anon/public key has zero access; the app connects with the service-role key,
-- which bypasses RLS.

create extension if not exists pgcrypto;

-- Accounts (was Store.users) -------------------------------------------------
create table if not exists accounts (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  role          text not null check (role in ('super','admin')),
  created_at    timestamptz not null default now(),
  -- null = never expires (super + manual admins); trial admins expire 7d out.
  expires_at    timestamptz,
  source        text not null default 'manual' check (source in ('manual','demo'))
);
create index if not exists accounts_email_idx on accounts (lower(email));

-- Monotonic, never-reused table numbers --------------------------------------
create sequence if not exists table_seq;
create or replace function next_table_num() returns bigint
  language sql volatile as $$ select nextval('table_seq') $$;

-- Tables (LiveTable) ---------------------------------------------------------
create table if not exists tables (
  num          bigint primary key,
  owner        uuid not null references accounts(id) on delete cascade,
  token        text not null,
  status       text not null,
  amount       text not null default '—',
  items        jsonb not null default '[]'::jsonb,
  paid         numeric not null default 0,
  paid_qty     jsonb not null default '[]'::jsonb,
  reservations jsonb not null default '[]'::jsonb,
  -- per-row optimistic-concurrency counter (CAS on update)
  version      bigint not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists tables_owner_idx on tables (owner);

-- Transactions (ledger) ------------------------------------------------------
create table if not exists transactions (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references accounts(id) on delete cascade,
  table_num  bigint not null,
  time       text not null,
  amount     text not null,
  method     text not null,
  created_at timestamptz not null default now()
);
create index if not exists transactions_owner_idx on transactions (owner, created_at desc);

-- Menus (per owner) ----------------------------------------------------------
create table if not exists menus (
  owner         uuid primary key references accounts(id) on delete cascade,
  filename      text not null,
  url           text not null,
  mime          text not null,
  original_name text not null,
  uploaded_at   timestamptz not null default now()
);

-- Settings (per owner) -------------------------------------------------------
create table if not exists settings (
  owner         uuid primary key references accounts(id) on delete cascade,
  name          text not null default '',
  tax_rate      numeric not null default 8,
  auto_receipts boolean not null default true,
  tip_prompts   boolean not null default true
);

-- Leads (marketing demo requests) --------------------------------------------
create table if not exists leads (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  restaurant text not null,
  created_at timestamptz not null default now()
);
create index if not exists leads_created_idx on leads (created_at desc);

-- Login throttling -----------------------------------------------------------
create table if not exists login_attempts (
  key          text primary key,
  fails        int not null,
  window_end   bigint not null,
  locked_until bigint not null
);

-- Lock everything down to the service role (anon/public gets nothing) ---------
alter table accounts        enable row level security;
alter table tables          enable row level security;
alter table transactions    enable row level security;
alter table menus           enable row level security;
alter table settings        enable row level security;
alter table leads           enable row level security;
alter table login_attempts  enable row level security;
