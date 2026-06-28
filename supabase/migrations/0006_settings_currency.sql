-- Per-admin display currency. Defaults to USD so existing rows keep working.
-- The app reads settings via select("*") and falls back to USD if this column
-- is absent, and the settings write retries without `currency` when the column
-- is missing, so deploying the app before this migration is safe.

alter table settings
  add column if not exists currency text not null default 'USD';

alter table settings
  drop constraint if exists settings_currency_chk;
alter table settings
  add constraint settings_currency_chk check (currency in ('USD','GBP','EUR','SAR'));
