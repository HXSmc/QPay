-- Super-admin replies to manager messages. Additive + idempotent.
-- A single reply per message (super responds; owner is emailed + sees it in the
-- dashboard thread). Replying marks the message resolved.

alter table manager_messages add column if not exists reply text;
alter table manager_messages add column if not exists replied_at timestamptz;
