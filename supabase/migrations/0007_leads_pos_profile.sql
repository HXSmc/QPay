-- Restaurant profiling + POS integration scaffolding.
--
-- Additive and idempotent. The app degrades gracefully before this runs:
--   • settings/leads reads use select("*"), so absent columns simply come back
--     undefined and fall back to defaults;
--   • settings/leads writes go through writeWithOptionalCols, which drops any
--     column PostgREST reports as unknown and retries.
-- So deploying the app before applying this migration is safe — these fields
-- just don't persist until it lands.

-- Per-restaurant profile + POS integration (admin → Settings).
alter table settings add column if not exists num_tables   integer;
alter table settings add column if not exists num_branches integer;
alter table settings add column if not exists pos_system   text;
-- Credentials the admin fills in to connect their POS (keyed by field key).
alter table settings add column if not exists pos_config   jsonb not null default '{}'::jsonb;

-- Demo + sales-contact lead profiling.
alter table leads add column if not exists kind            text not null default 'demo';
alter table leads add column if not exists phone           text;
alter table leads add column if not exists num_tables      integer;
alter table leads add column if not exists num_branches    integer;
alter table leads add column if not exists pos_system      text;
alter table leads add column if not exists preferred_dates text;
alter table leads add column if not exists message         text;

alter table leads drop constraint if exists leads_kind_chk;
alter table leads add constraint leads_kind_chk check (kind in ('demo','sales'));
