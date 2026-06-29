-- Payment scaffolding (non-money-touching). Additive + idempotent so it is safe
-- to apply before an acquirer/legal is finalized: nothing reads these yet (the
-- route handlers return 501 until the real integration lands). See payplan.md.
--
-- Funds-flow rule (payplan.md §0): money moves acquirer -> restaurant sub-merchant
-- -> IBAN directly. Nuqra never pools funds. These tables only TRACK state; they
-- never hold balances. The IBAN, if stored at all, is encrypted (payplan §3.1);
-- prefer processor-of-record and keep only the masked last-4 + Destination ID.

-- 1) Per-restaurant payout identity on accounts (each admin = one sub-merchant).
alter table accounts add column if not exists processor_account_id text;      -- acquirer sub-merchant / Destination ID (source of truth)
alter table accounts add column if not exists payout_iban_last4    text;      -- masked, display only ("1234")
alter table accounts add column if not exists payout_iban_enc      bytea;     -- OPTIONAL encrypted full IBAN; omit if processor-of-record
alter table accounts add column if not exists payout_name          text;      -- legal account-holder name (matches CR/bank)
alter table accounts add column if not exists cr_number            text;      -- Commercial Registration (KYC)
alter table accounts add column if not exists payouts_enabled      boolean not null default false; -- mirrors acquirer KYC; gates pay
alter table accounts add column if not exists default_processor    text;      -- 'tap' | 'paytabs' | 'moyasar' | 'stripe'

-- 2) PaymentIntent state machine (the customer pay flow reads/advances this).
create table if not exists payment_intents (
  id                  uuid primary key default gen_random_uuid(),
  owner               uuid not null references accounts(id) on delete cascade,
  table_id            uuid references tables(id) on delete set null,
  table_token         text,
  idempotency_key     text not null unique,          -- {token}:{split}:{share}
  processor           text not null,                 -- 'tap' | 'paytabs' | 'moyasar' | 'stripe'
  processor_intent_id text,                          -- pi_... / charge id
  amount              integer not null,              -- smallest unit (halalas for SAR)
  tip_amount          integer not null default 0,
  application_fee     integer not null default 0,    -- Nuqra commission (acquirer-native split)
  currency            text not null default 'SAR',
  status              text not null default 'requires_payment_method',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists payment_intents_owner_idx on payment_intents (owner);
create index if not exists payment_intents_status_idx on payment_intents (status);
create index if not exists payment_intents_processor_intent_idx on payment_intents (processor_intent_id);

-- 3) Webhook event log (dedupe + audit; at-least-once delivery safe).
create table if not exists webhook_events (
  event_id     text primary key,   -- acquirer event id; ON CONFLICT DO NOTHING = idempotency
  processor    text,
  type         text,
  payload      jsonb,
  processed_at timestamptz not null default now()
);
