-- Optional structured menu items + in-app customer ordering.
-- Idempotent (create-if-not-exists). RLS enabled, no policies: the anon key has
-- zero access; the app uses the service-role key which bypasses RLS. Backward
-- compatible — if an owner defines no items, the diner UI is unchanged.

-- Orderable menu items (per owner) -------------------------------------------
create table if not exists menu_items (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references accounts(id) on delete cascade,
  name        text not null,
  price       numeric not null default 0 check (price >= 0),
  category    text not null default '',
  description text not null default '',
  available   boolean not null default true,
  sort_order  int not null default 0,
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists menu_items_owner_idx on menu_items (owner, sort_order, created_at);
alter table menu_items enable row level security;

-- Customer orders (lines stored as jsonb, mirroring tables.items) -------------
-- lines: [{ menuItemId, name, price, qty, comment }]  (name/price snapshotted)
create table if not exists orders (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references accounts(id) on delete cascade,
  table_id   uuid not null references tables(id) on delete cascade,
  table_num  bigint not null,
  status     text not null default 'placed'
             check (status in ('placed','preparing','served','cancelled')),
  lines      jsonb not null default '[]'::jsonb,
  total      numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists orders_owner_idx on orders (owner, created_at desc);
create index if not exists orders_table_idx on orders (table_id);
alter table orders enable row level security;
