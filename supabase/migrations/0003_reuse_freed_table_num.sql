-- Reuse freed table numbers. Deleting a table should free its number so the next
-- "+ New table" fills the gap instead of skipping (delete table 2 → next is 2,
-- not 3). Safe because public lookups resolve by the unique `token`, not `num`:
-- a stale QR carries the deleted table's token, which no longer exists → 404.
--
-- Replaces the monotonic per-owner counter with a "smallest free positive
-- integer for this owner" allocator derived from the live rows. Idempotent.

create or replace function next_table_num(p_owner uuid) returns bigint
  language sql stable as $$
  select coalesce(
    (
      select min(s.n)
      from generate_series(
             1,
             (select coalesce(max(num), 0) + 1 from tables where owner = p_owner)
           ) as s(n)
      where not exists (
        select 1 from tables where owner = p_owner and num = s.n
      )
    ),
    1
  );
$$;

-- The counter table is no longer used (numbers derive from live rows).
drop table if exists owner_counters;
