// One-time migration: read the legacy `qpay:store` jsonb blob and populate the
// relational tables (accounts, tables, transactions, menus, settings, leads,
// login_attempts). The old `store` row is left intact as a backup.
//
// Usage:
//   DB_URL=postgres://... node scripts/migrate-blob-to-relational.mjs [--force]
//
// Idempotent guard: aborts if `accounts` already has rows unless --force is set.
// Re-running with --force re-seeds tables/settings/menus/login_attempts via
// upsert and replaces all transactions/leads.

import pg from "pg";

const { Client } = pg;
const DB_URL = process.env.DB_URL;
const FORCE = process.argv.includes("--force");
if (!DB_URL) {
  console.error("DB_URL env is required");
  process.exit(1);
}

const c = new Client({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

const j = (v) => JSON.stringify(v ?? null);

async function main() {
  await c.connect();

  const { rows } = await c.query(
    "select value from store where key = 'qpay:store'",
  );
  if (!rows.length) {
    console.log("no qpay:store blob found — nothing to migrate");
    return;
  }
  const store = rows[0].value;

  const have = await c.query("select count(*)::int n from accounts");
  if (have.rows[0].n > 0 && !FORCE) {
    console.log(
      `accounts already populated (${have.rows[0].n} rows). Re-run with --force to overwrite. Skipping.`,
    );
    return;
  }

  await c.query("begin");
  try {
    // Accounts ---------------------------------------------------------------
    for (const u of store.users ?? []) {
      await c.query(
        `insert into accounts (id, email, password_hash, role, created_at, expires_at, source)
         values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (id) do update set
           email=excluded.email, password_hash=excluded.password_hash,
           role=excluded.role, created_at=excluded.created_at,
           expires_at=excluded.expires_at, source=excluded.source`,
        [
          u.id,
          String(u.email).trim().toLowerCase(),
          u.passwordHash,
          u.role,
          u.createdAt ?? new Date().toISOString(),
          u.expiresAt ?? null,
          u.source ?? "manual",
        ],
      );
    }

    // Settings ---------------------------------------------------------------
    for (const [owner, s] of Object.entries(store.settings ?? {})) {
      await c.query(
        `insert into settings (owner, name, tax_rate, auto_receipts, tip_prompts)
         values ($1,$2,$3,$4,$5)
         on conflict (owner) do update set
           name=excluded.name, tax_rate=excluded.tax_rate,
           auto_receipts=excluded.auto_receipts, tip_prompts=excluded.tip_prompts`,
        [
          owner,
          s.name ?? "",
          typeof s.taxRate === "number" ? s.taxRate : 8,
          s.autoReceipts ?? true,
          s.tipPrompts ?? true,
        ],
      );
    }

    // Menus ------------------------------------------------------------------
    for (const [owner, m] of Object.entries(store.menus ?? {})) {
      await c.query(
        `insert into menus (owner, filename, url, mime, original_name, uploaded_at)
         values ($1,$2,$3,$4,$5,$6)
         on conflict (owner) do update set
           filename=excluded.filename, url=excluded.url, mime=excluded.mime,
           original_name=excluded.original_name, uploaded_at=excluded.uploaded_at`,
        [owner, m.filename, m.url, m.mime, m.originalName, m.uploadedAt],
      );
    }

    // Tables -----------------------------------------------------------------
    for (const t of store.tables ?? []) {
      if (!t.owner) continue; // owner-less legacy rows are dropped (same as normalize)
      await c.query(
        `insert into tables (num, owner, token, status, amount, items, paid, paid_qty, reservations, version)
         values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8::jsonb,$9::jsonb,0)
         on conflict (num) do update set
           owner=excluded.owner, token=excluded.token, status=excluded.status,
           amount=excluded.amount, items=excluded.items, paid=excluded.paid,
           paid_qty=excluded.paid_qty, reservations=excluded.reservations`,
        [
          Number(t.num),
          t.owner,
          t.token ?? null,
          t.status ?? "open",
          t.amount ?? "—",
          j(t.items ?? []),
          typeof t.paid === "number" ? t.paid : 0,
          j(t.paidQty ?? []),
          j(t.reservations ?? []),
        ],
      );
    }

    // Transactions (replace) -------------------------------------------------
    // Blob is newest-first; assign descending created_at so order is preserved.
    await c.query("delete from transactions");
    const txns = store.transactions ?? [];
    const base = Date.now();
    for (let i = 0; i < txns.length; i++) {
      const tx = txns[i];
      if (!tx.owner) continue;
      await c.query(
        `insert into transactions (owner, table_num, time, amount, method, created_at)
         values ($1,$2,$3,$4,$5,$6)`,
        [
          tx.owner,
          Number(tx.table) || 0,
          tx.time ?? "",
          tx.amount ?? "$0",
          tx.method ?? "Card",
          new Date(base - i * 1000).toISOString(),
        ],
      );
    }

    // Leads (replace) --------------------------------------------------------
    await c.query("delete from leads");
    for (const ld of store.leads ?? []) {
      await c.query(
        `insert into leads (id, name, email, restaurant, created_at)
         values (coalesce($1::uuid, gen_random_uuid()),$2,$3,$4,$5)`,
        [
          isUuid(ld.id) ? ld.id : null,
          ld.name ?? "",
          ld.email ?? "",
          ld.restaurant ?? "",
          ld.ts ?? new Date().toISOString(),
        ],
      );
    }

    // Login attempts ---------------------------------------------------------
    for (const [key, a] of Object.entries(store.loginAttempts ?? {})) {
      await c.query(
        `insert into login_attempts (key, fails, window_end, locked_until)
         values ($1,$2,$3,$4)
         on conflict (key) do update set
           fails=excluded.fails, window_end=excluded.window_end, locked_until=excluded.locked_until`,
        [key, a.fails ?? 0, a.windowEnd ?? 0, a.lockedUntil ?? 0],
      );
    }

    // Sequence: next table number must exceed every existing one ------------
    const maxNum = Math.max(
      0,
      Number(store.seq) || 0,
      ...(store.tables ?? []).map((t) => Number(t.num) || 0),
    );
    await c.query("select setval('table_seq', $1, true)", [Math.max(1, maxNum)]);

    await c.query("commit");
    console.log("MIGRATION_OK");
  } catch (e) {
    await c.query("rollback");
    console.error("MIGRATION_FAIL", e.message);
    process.exitCode = 1;
  }

  // Report row counts.
  for (const tbl of [
    "accounts",
    "tables",
    "transactions",
    "menus",
    "settings",
    "leads",
    "login_attempts",
  ]) {
    const r = await c.query(`select count(*)::int n from ${tbl}`);
    console.log(`  ${tbl}: ${r.rows[0].n}`);
  }
}

function isUuid(s) {
  return (
    typeof s === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  );
}

main()
  .catch((e) => {
    console.error("FATAL", e.message);
    process.exitCode = 1;
  })
  .finally(() => c.end());
