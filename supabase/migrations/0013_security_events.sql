-- Durable security audit log (secure.md F3, 2026-08-01). Written best-effort /
-- fire-and-forget from auth-failure, lockout-trip, authz-denial, and
-- rate-limit-rejection paths (see app/lib/store.ts logSecurityEvent). Rows are
-- inserted by the service_role client; RLS is ENABLED with NO policy so anon/
-- public get nothing (deny-by-default, matching every other table). Additive
-- and idempotent.

create table if not exists security_events (
  id    bigint generated always as identity primary key,
  at    timestamptz not null default now(),
  type  text not null,
  actor text,
  ip    text,
  meta  jsonb
);

create index if not exists security_events_at_idx on security_events(at desc);
create index if not exists security_events_type_idx on security_events(type);

alter table security_events enable row level security;
