-- Per-session revocation denylist (secure.md F3, 2026-08-03). A logged-out
-- session's jti is inserted here (app/lib/store-sb.ts revokeSession); authedUser
-- (app/lib/store.ts) rejects any cookie whose jti is present, so a captured
-- pre-logout cookie is denied before its 8h exp elapses. Rows carry the token's
-- OWN expiry as TTL and revokeSession opportunistically sweeps expired rows, so
-- the table is bounded by live outstanding sessions, not unbounded history.
-- Inserted by the service_role client on logout; RLS ENABLED with NO policy so
-- anon/public get nothing (deny-by-default, matching every other table).
-- Additive and idempotent. NOTE: write-only here — the hub applies this via MCP;
-- this file MUST NOT be applied by the spoke.

create table if not exists revoked_sessions (
  jti         text primary key,
  expires_at  bigint not null
);

create index if not exists revoked_sessions_expires_idx on revoked_sessions(expires_at);

alter table revoked_sessions enable row level security;
