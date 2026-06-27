# Design — Trial-admin provisioning, account expiry, superadmin lifecycle, relational store

Date: 2026-06-27 · Status: approved-in-progress

## Goal
Three user-facing capabilities + one infra upgrade:
1. **Marketing "Get demo" → self-service trial admin.** The demo form's *work email* receives a generated admin password. The trial admin account is valid **7 days**.
2. **Superadmin lifecycle.** Superadmin can **renew** an admin for **30 days** and **edit** an admin's email + password.
3. **Database upgrade → full relational migration.** Replace the single `qpay:store` jsonb blob with per-row relational Postgres tables + indexes for scalability and future features.

## Decisions (locked)
- Email delivery: **Resend** (real send) via REST. Send-only API key. `RESEND_FROM` env (default `QPay <onboarding@resend.dev>`); real delivery to arbitrary addresses requires a verified domain.
- DB: **full relational migration** (not additive).
- Abuse control: **one trial admin per email** — re-submitting renews + re-issues; existing manual/super accounts are never overwritten (lead captured only). Keep IP rate-limit. 7-day expiry auto-disables login.

## Data model changes (`app/lib/types.ts`)
`AdminUser` gains:
- `expiresAt?: string | null` — ISO. `null`/absent = never expires (super + manual admins). Trial admins set to now+7d.
- `source: 'manual' | 'demo'` — provenance; demo = self-service trial.

`PublicUser` (and `AdminAccount` client type) additionally expose `expiresAt`, `source`, and a derived `active` (`!expiresAt || expiresAt > now`).

## Relational schema (Supabase)
New tables replacing the blob (DDL in `supabase/migrations/0001_relational.sql`):
- `accounts(id uuid pk, email text unique, password_hash text, role text, created_at timestamptz, expires_at timestamptz null, source text default 'manual')`
- `tables(num bigint pk, owner uuid fk→accounts on delete cascade, token text, status text, amount text, items jsonb, paid numeric, paid_qty jsonb, reservations jsonb, version bigint default 0)`
- `transactions(id uuid pk, owner uuid fk cascade, table_num bigint, time text, amount text, method text, created_at timestamptz)`
- `menus(owner uuid pk fk cascade, filename, url, mime, original_name, uploaded_at)`
- `settings(owner uuid pk fk cascade, name, tax_rate numeric, auto_receipts bool, tip_prompts bool)`
- `leads(id uuid pk, name, email, restaurant, created_at timestamptz)`
- `login_attempts(key text pk, fails int, window_end bigint, locked_until bigint)`
- `sequence table_seq` — monotonic, never-reused table numbers (replaces `seq`).
- Indexes: `tables(owner)`, `transactions(owner, created_at desc)`, `leads(created_at desc)`, `accounts(email)`.

Per-row **optimistic concurrency** for `tables` (`version` column, CAS on UPDATE) replaces whole-blob CAS — concurrent pays on *different* tables no longer serialize.

## Store layer (`app/lib/store.ts`)
- **Exported function signatures unchanged** → API routes untouched (isolation boundary). Internals rewritten:
  - `useSupabase` path → relational queries (per-row reads/writes, per-row CAS for table mutations).
  - Disk fallback retained unchanged for local dev / offline build.
- New: `expires_at`/`source` plumbed through `createAdmin`, `listAdmins`, `authedUser`, login.
- New exports: `provisionTrialAdmin(email, restaurant)`, `renewAdmin(id, days)`, `updateAdmin(id, {email?, passwordHash?})`.
- `authedUser()` returns null for an account whose `expiresAt < now` → expired trial instantly loses access (same revoke mechanism as delete).

## Email (`app/lib/email.ts`)
`sendMail({to, subject, html, text})` → `POST https://api.resend.com/emails`. Used by trial provisioning to send the password + `/admin/login` link. Account is created first; a send failure surfaces an error but leaves the account (superadmin can edit/resend).

## API
- `POST /api/leads` (renamed intent): validate → `provisionTrialAdmin` (dedupe/renew) → `sendMail` → also `addLead`. Returns `{ ok, emailed }`. Password never returned in the HTTP body.
- `PATCH /api/admins/[id]` (super only, CSRF, rate-limited): `{ action:'renew', days?:30 }` or `{ email?, password? }`.
- `GET /api/admins` returns `expiresAt`, `source`, `active`.
- Login route: after password verify, reject expired account with 403 `account expired`.

## UI
- **DemoModal**: success copy → "Check your work email — we've sent your QPay admin login (valid 7 days)." Error path if email send fails.
- **Superadmin**: each admin row shows trial/manual badge + Active/Expired + expiry date; actions **Renew 30d**, **Edit** (inline email + new password), **Delete**.

## Data migration
`scripts/migrate-blob-to-relational.mjs` (run once with service key + DB URL): read `qpay:store` blob → insert rows into the new tables; set `table_seq` to max(num). Keeps the old `store` row as backup. Idempotent via upsert on pk/email.

## Testing
- `npm run build` (typecheck + lint) clean.
- Deploy to Vercel project `qpay`; verify on `https://qpay-cyan.vercel.app` with Chrome DevTools MCP:
  - demo submit → account provisioned, email sent (to verified/own address), success UI.
  - trial login works; after expiry simulated (renew to past via DB), login 403.
  - superadmin renew → expiry +30d; edit email/password → new creds log in, old fail.
  - per-owner isolation intact; existing flows (pay/sync/settings) unaffected.
- curl for API/isolation/expiry/CSRF.

## Risks
- Relational rewrite is the spine (every route depends on store.ts) — signatures held stable to contain blast radius; verified against live + build.
- DDL needs a Postgres connection string (service key can't DDL) — gated on user-provided creds.
- Resend real delivery limited to verified domain / account-owner email until a domain is verified.
