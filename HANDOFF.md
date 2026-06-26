# QPay — Context Handoff

> Handoff for a new agent taking over. Captures current architecture, everything built across recent sessions, how the multi‑phone sync works, known weak spots, and the next task.

## What it is
B2B2C QR restaurant‑payment prototype (qlub‑like). **Next.js 14 App Router + TypeScript**. All styling is **inline** (no Tailwind); responsive behaviour added via `.qp-*` classes + one `@media` block in `app/globals.css` (inline styles can't express `:hover`/`@media`, so those classes override inline with `!important`). Plus Jakarta Sans via `next/font`, icons = inline SVG. Brand blue `#2E5BFF`.

## Run / build / deploy
- Project root: `/Users/alimc/Desktop/web apps/Qlub`
- `npm install` → `npm run dev` → http://localhost:3000
- `npm run build` passes (typecheck + lint clean). 14 routes + middleware.
- Demo admin login: `admin@qpay.com` / `demo1234`
- Git remote: `github.com/HXSmc/Qlub` (origin). Deployed on **Vercel**. **Latest local changes are NOT yet committed/pushed** — confirm with the user before pushing (branch off `main`).
- Pre-existing `npm audit` criticals are from Next.js 14.2.5 + postcss (not app code). Don't `audit fix --force` (bumps Next out of range) without asking.

## Data store — three backends, auto-selected
`app/lib/store.ts` reads/writes the **whole `Store` object as one blob**. Backend precedence (by env): **Supabase → Vercel KV → local disk** (`data/store.json`).
- **Supabase** (the live cross-device store): set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Requires a table:
  ```sql
  create table if not exists store (key text primary key, value jsonb not null);
  ```
  Stored under key `qpay:store`. Service-role key bypasses RLS; keep it server-only.
- **Vercel KV**: `KV_REST_API_URL` + `KV_REST_API_TOKEN` (fallback, dynamic import).
- **Disk**: default locally; `data/` is gitignored and reseeds when deleted.
- `NEXT_PUBLIC_APP_URL` must be the prod domain so QR codes encode the public host (baked at build → redeploy after changing). See `.env.example`.
- `normalize()` backfills new fields on old rows, so existing stores don't crash. **Statuses only change via `seed()`** — to reset to defaults, delete the `store` row (Supabase) or `data/store.json` (disk); it reseeds (all tables Open except **T12** which carries a 5‑item demo order, Unpaid).

## Data model — `app/lib/types.ts`
- `LiveTable { num, status, amount, items: OrderItem[], paid: number, paidQty: number[], reservations: Reservation[] }`
  - `paid` = cumulative **principal** paid (subtotal+tax; **tip is cosmetic/per‑payer, untracked**).
  - `paidQty[]` = units **paid** per item (index‑aligned to `items`) — these lock permanently.
  - `reservations[]` = live holds.
- `Reservation { id: string; qty: number[]; ts: number }` — `id` = per‑phone client id, `qty` index‑aligned, `ts` = last heartbeat (ms). Pruned after `RESV_TTL_MS` (8000ms).
- `OrderItem { name, qty, price }` (`price` = line total for the qty).
- `TableStatus = "unpaid" | "partial" | "cleared" | "open"`.
- `billDue(items)` in `app/lib/data.ts` = `subtotal * 1.08` (the principal owed).

## Store functions (`app/lib/store.ts`)
`listTables / createTable / getTable / setTableItems / setTableStatus / deleteTable / listTransactions / getMenu / setMenu / clearMenu` plus:
- `syncReservation(num, id, qty[])` — prune stale, upsert this phone's hold (dropped if all‑zero), return table. Advisory only.
- `payTable(num, amount, { id?, items? })` — clamps `amount` to `remaining = due - paid` (**no overpay**), `paid += applied`; if `items` given, `paidQty[i] += items[i]` capped at `qty` (**locks units**); removes caller's reservation; sets `cleared` (paid ≥ due) / `partial`. 
- `setTableItems(num, [])` resets `paid=0`, `paidQty=[]`, status `open` (this is the admin "Clear table" path). Any item edit resets `paidQty`/`reservations`.

## API — `app/api/tables/[num]/route.ts` (PATCH branches, in order)
- `{ sync: { id, qty } }` → `syncReservation` (heartbeat).
- `{ pay, id?, payItems? }` → `payTable` (validates number arrays via `numArray`).
- `{ items }` → `setTableItems`. `{ status }` → `setTableStatus`. `DELETE` → `deleteTable`. `GET` single table.
Client wrappers in `app/lib/api.ts`: `syncTable(num,id,qty)`, `payTable(num,amount,{id,items})`, `setTableItems`, `deleteTable`, etc. All `cache: no-store`.

## How multi-phone sync works (the key flow)
`app/components/CustomerView.tsx` is **server-state driven**:
- Per‑phone `clientId` in `sessionStorage`.
- **3s poll** calls `syncTable()` (also fires immediately on selection/mode change): heartbeats this phone's item selection as a reservation AND reads back the merged table → `setTable(resp)`. This replaced the old `router.refresh()` poll and also surfaces admin order edits.
- Derived: `reservedByOthers[i]` (sum of other clients' `qty[i]`), `available[i] = qty − paidQty − reservedByOthers`, `remaining = due − paid`.
- Pay amounts are **remaining‑based**: full → remaining; equal → `min(due/people × payingFor, remaining)`; item → selected subtotal + proportional tax. Tip added cosmetically on top. All three buttons (Apple/Google/Pay Now) call `handlePay`, which sends `{ id, items }`.
- UI: per‑item **Paid**/**Held** badges, shared "Paid so far / Remaining" in totals, fully‑paid state. `app/customer/page.tsx` passes the full server snapshot as `initialTable`.

## Features done (verified)
- **Admin** (`app/admin/(dash)/...` under `Sidebar` shell): dashboard metrics + live tables + recent transactions; **Tables** page with per‑table QR (`QrModal`), Add order / `OrderModal`, **Delete** (red, confirm), **Clear table** (green, shows only when fully paid — status is payment‑driven, the old manual status‑cycle button was removed), and "Paid X of Y" on partial cards; Menu upload; Analytics; Settings; Export CSV; cookie auth via `middleware.ts`.
- **Customer**: per‑table order via `?table=N`, split (full / equal / per‑item), tip (0/10/15/20/custom), empty state, **mock payments** (all three buttons), success card, and the collaborative multi‑phone split above.
- **Partial pay**: paying part → `partial`; paying the rest / full → `cleared`; admin then "Clear table" → `open`.
- **Mobile**: viewport meta in `app/layout.tsx`; `@media (max-width:768px)` block in `globals.css` with `.qp-page`, `.qp-grid-4/2`, `.qp-hero-grid`, `.qp-section`, `.qp-hide-mobile`, `.qp-scroll-x`, `.qp-sidebar`/`.qp-admin-shell` (sidebar → horizontal top bar). Applied across MarketingView, all admin pages, modals.
- **Default tables**: all seed Open except T12 demo order.

Verification used: `npm run build` + curl sequences against the API (reserve from two ids, item pay locks the unit, full pay clamps to remaining → cleared, overpay clamped, admin clear resets). UI not visually regression-tested headless; live cross-device behaviour needs a deploy with Supabase env set.

## Key files
- `app/lib/{types,data,store,api,url,auth,csv}.ts`
- `app/api/tables/route.ts`, `app/api/tables/[num]/route.ts`, `app/api/{transactions,menu,auth}/...`
- `app/components/CustomerView.tsx`, `app/components/MarketingView.tsx`, `app/components/admin/{Sidebar,QrModal,OrderModal}.tsx`, `app/components/site/{BrandHeader,DemoModal,SalesDropdown,MenuModal}.tsx`
- `app/admin/(dash)/{layout,page,tables,transactions,menu,analytics,settings}`, `app/customer/page.tsx`, `app/layout.tsx`, `app/globals.css`, `middleware.ts`

## Known limitations / likely "irregular behaviour" to investigate
1. **Concurrency (the main open issue): single jsonb blob with read‑modify‑write = last‑write‑wins.** Two phones heart‑beating/paying at the same instant can clobber each other → reservations flicker, and a simultaneous payment can be *lost* (no double‑charge thanks to clamping, but the payer must retry). This is the "syncing while paying" weakness the user wants hardened. Options: a Supabase Postgres RPC that updates the jsonb atomically (row lock), an optimistic‑concurrency `version` column with retry, or move to **per‑table rows** instead of one blob.
2. **Heartbeat write amplification**: every open phone writes every 3s. Fine for demo; costly at scale. Consider Supabase Realtime/Postgres changes or websockets/SSE instead of polling.
3. **Equal split** uses a **local** `peopleAtTable`/`payingFor` per phone (not shared) — only the remaining cap is shared. Two phones can disagree on headcount.
4. **Mixed split modes**: equal/full payments add to `paid` but don't lock specific `paidQty`, so item‑payers may still see unlocked items even as `remaining` shrinks (guarded by remaining/clamping, but worth UX review).
5. **Menu file uploads** still need Vercel **Blob** (`BLOB_READ_WRITE_TOKEN`) to persist on serverless; table/order data is covered by Supabase but uploaded menu *files* are not.
6. **Hydration**: `clientId` initializer returns `"ssr"` server‑side then a real id client‑side — not rendered to DOM so no mismatch, but verify if you touch that code.
7. **QR host**: if `NEXT_PUBLIC_APP_URL` is unset/wrong at build, QR encodes localhost and phones can't load. Set it and redeploy.

## Next / open (the task in flight when this was written)
- **Harden the multi‑phone payment sync** so concurrent pays/selections from 2+ phones never lose updates or flicker (see limitation #1 — recommend per‑table rows or an atomic Supabase RPC, and consider replacing 3s polling with realtime).
- **Sweep for bugs / irregular behaviour** across the app (admin + customer + mobile), especially around concurrent payment, equal‑split headcount sharing, and item‑lock edge cases.
- After changes: `npm run build`, then a real two‑device (or two‑browser, two `clientId`) test against Supabase. Then offer to commit + push (branch off `main`) so Vercel redeploys.
