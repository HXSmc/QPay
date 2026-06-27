# QPay — Context Handoff

> Handoff for the next agent. Captures architecture, everything built/fixed across recent sessions, how multi‑phone sync works, the prod backend, the testing setup, and what's left.

## What it is
B2B2C QR restaurant‑payment prototype (qlub‑like). **Next.js 14 App Router + TypeScript**. All styling is **inline** (no Tailwind); responsive behaviour via `.qp-*` classes + one `@media` block in `app/globals.css`. Jakarta Sans via `next/font`; icons = inline SVG. Brand blue `#2E5BFF`.

## Run / build / deploy
- Project root: `/Users/alimc/Desktop/web apps/Qlub`
- `npm install` → `npm run dev` → http://localhost:3000
- `npm run build` passes (typecheck + lint clean). 14 routes + async middleware.
- Demo admin login: `admin@qpay.com` / `demo1234`
- **Deploy target: Vercel, project `qpay-cyan` → https://qpay-cyan.vercel.app**, connected to GitHub repo **`github.com/HXSmc/QPay`**.
- **Git remotes:** `origin` = `github.com/HXSmc/Qlub.git` (older mirror), `qpay` = `github.com/HXSmc/QPay.git` (the deploy repo). **Push to `qpay` to trigger a Vercel redeploy:** `git push qpay HEAD:main`. Both repos were in sync; recent fixes were pushed to `qpay` only.
- Recent commits on `main`: `d3e9b75` (harden payment sync + first fixes), `18c617c` (13-bug audit fixes). Verified live.

## Production backend — Supabase (LIVE, working)
The whole `Store` object is one jsonb blob under key `qpay:store` in a Supabase table:
```sql
create table if not exists store (key text primary key, value jsonb not null);
```
- Backend precedence (`app/lib/store.ts`): **Supabase → Vercel KV → disk**.
- **Vercel env vars (already set, do NOT echo their values):** `SUPABASE_URL` (must be the BARE project URL `https://<ref>.supabase.co`, NOT the `…/rest/v1/` REST endpoint — that suffix breaks `createClient`; the code now strips it defensively), `SUPABASE_SERVICE_ROLE_KEY` (service‑role, server‑only).
- Supabase project ref: `rvcjvoqjrzjwdxsuckvh`. The service‑role key the user shared is held outside this repo — ask the user if you need it; never commit it.
- **Reset prod store to clean demo:** delete the `qpay:store` row (Supabase REST `DELETE /rest/v1/store?key=eq.qpay:store` with the service key, or SQL editor); the app reseeds on next read (all tables Open except **T12** = 5‑item demo order, Unpaid).
- Disk mode is local‑dev only (Vercel's FS is read‑only); KV is an untested fallback.
- **Menu file uploads** still need Vercel **Blob** (`BLOB_READ_WRITE_TOKEN`) to persist on serverless; table/order/menu‑metadata are covered by Supabase, uploaded menu *files* are not.

## Data model — `app/lib/types.ts`
- `LiveTable { num, status, amount, items: OrderItem[], paid, paidQty: number[], reservations: Reservation[] }`
  - `paid` = cumulative **principal** paid (subtotal+tax; **tip is cosmetic/per‑payer, untracked**).
  - `paidQty[]` = units **paid** per item (index‑aligned), lock permanently.
  - `reservations[]` = live holds. `Reservation { id, qty[], ts }`, pruned after `RESV_TTL_MS` (8000ms).
- `amount` (display string) = `billDue(items)` = subtotal × 1.08 (now **includes tax** — was subtotal-only before).
- `Store` also carries a `version` (optimistic‑concurrency counter).

## Store + concurrency (`app/lib/store.ts`)
- Mutations go through `mutate()`: an **in‑process async lock** (serializes within one Node instance) + **optimistic‑concurrency CAS** on Supabase (`commit()` does a conditional UPDATE matching the read `version`; on a real version advance it retries; fail‑safe degrades to an unconditional write so a payment is never hard‑blocked).
- Supabase read/write errors now **throw** (no more silent re‑seed that wiped live data / hid misconfig).
- `payTable(num, amount, { id?, items?, method? })` clamps to remaining (no overpay), locks only the item units the **applied** money covers, drops the caller's hold, **and records a `Transaction`** in the ledger.
- `setTableItems(num, items)` resets `paid=0`, `paidQty=[]`, reservations on every order replacement.
- `syncReservation` clamps each hold to the item's ordered qty.

## API — `app/api/tables/[num]/route.ts` (PATCH branches, in order)
- `{ sync: { id, qty } }` → heartbeat (public). `{ pay, id?, payItems?, method? }` → pay (public).
- `{ items }` / `{ status }` → admin‑only (require session). `DELETE` → admin‑only. `GET` single table = public.
- `app/api/tables/route.ts`: `GET` list + `POST` create are **admin‑only**.
- `app/api/transactions` GET, `app/api/menu` POST/DELETE = **admin‑only**; menu upload capped at 8MB.
- Auth is checked via `isAdminRequest(req)` from `app/lib/auth.ts`. Client wrappers in `app/lib/api.ts` (all `cache:no-store`).

## Auth (`app/lib/auth.ts`, `middleware.ts`)
- Mock creds, but the session cookie is now an **HMAC‑signed, expiring token** (`exp.signature`), verified via Web Crypto (`crypto.subtle`, edge‑safe) with a constant‑time compare — not the old forgeable `qpay_admin=1`.
- Signing key = `process.env.SESSION_SECRET` with a dev fallback constant. **TODO: set `SESSION_SECRET` in Vercel** so the key isn't the in‑source fallback (works without it, but the fallback is public).
- `middleware.ts` is `async` and guards `/admin/:path*` (page routes); API routes self‑guard with `isAdminRequest`.

## Multi‑phone sync (`app/components/CustomerView.tsx`)
- Per‑phone `clientId` in `sessionStorage`. **3s poll** calls `syncTable()` → heartbeats this phone's item selection AND reads back the merged table.
- Request‑sequence guard (`reqSeq`/`appliedSeq`) so a slow poll can't clobber post‑payment state; a payment is authoritative.
- Reservation‑derived UI gated behind a post‑mount `mounted` flag (no clientId hydration mismatch).
- Pay buttons send a `method` (Apple Pay / Google Pay / Card). Receipt shows the **actually‑applied** amount and renders in both partial and fully‑paid states.

## Testing setup (important — environment quirks)
- **Chrome DevTools MCP** (`chrome-devtools` server) was failing: the system node `/usr/local/bin/node` is v20.2.0 but the package needs ≥20.19. Fixed by installing newer node via micromamba and repointing the MCP config in `~/.claude.json` (`command` → `/Users/alimc/micromamba/envs/nodejs/bin/npx`). `claude mcp list` shows `✔ Connected`, **but a running Claude Code session caches the startup MCP config — the tools only load in a FRESH session.** Restart Claude Code to get `mcp__chrome-devtools__*`.
- **Puppeteer fallback (what actually worked):** drive a browser directly. The Puppeteer‑downloaded Chrome‑for‑Testing binary is a *malformed Mach‑O* on this macOS, and the conda‑forge nodes fail to spawn it (errno ‑88). Run Puppeteer with **system node** (`/usr/local/bin/node`) and **system Chrome** via `executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`, `headless:true`. Use `waitUntil:"domcontentloaded"` (the 3s poll never lets `networkidle2` settle). Note inline‑style text is uppercased by CSS, so match `innerText` case‑insensitively.
- Reusable test scripts live in the session scratchpad: `twophone.mjs` (two isolated browser contexts = two phones, full split‑pay flow + screenshots), `ui-smoke.mjs` (sales dropdown, cleared receipt, hydration). Adapt as needed.
- API/concurrency are easiest to verify with curl (simulate phones via distinct `id`s; fire concurrent pays with `&`).

## Bug report
`bugs.md` (repo root, **gitignored — keep it that way**) holds the full audit: 15 confirmed findings (dupes merged → 13 fixed) plus the rejected list. Regenerate/append if you run another hunt.

## What's done (verified live)
- Split‑pay across phones works end‑to‑end (cross‑phone holds, item locks, concurrent‑pay no lost updates via CAS) — confirmed with two real browsers + curl.
- All 13 audit bugs fixed and verified on prod (auth forgery → 401, login works, payments logged to ledger, tax in amount, cleared receipt, sales dropdown, etc.).

## Next / open
1. **Set `SESSION_SECRET` in Vercel** (auth signing key; currently a public fallback).
2. **Vercel Blob** (`BLOB_READ_WRITE_TOKEN`) for persistent menu‑file uploads on serverless.
3. **Deferred design items (not bugs):** equal‑split headcount (`peopleAtTable`/`payingFor`) is per‑phone, not shared across phones (no overpay; remaining is clamped); equal/full pays bump `paid` but don't lock specific `paidQty` (guarded by the remaining clamp). Decide whether to share headcount via server state and/or forbid mixing split modes on one table.
4. Optional hardening surfaced but deprioritized: CSV formula‑injection escaping on export; DemoModal a11y (Escape/scroll‑lock/focus‑trap); constant‑time login compare.
5. After changes: `npm run build`, push to `qpay`, wait for redeploy, re‑run the two‑phone + curl checks. Reset the Supabase store to clean demo when done.
