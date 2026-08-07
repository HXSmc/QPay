# Nuqra Immersive Design Direction

Prescriptive brief for four surfaces: the marketing landing page, `/demo/customer`
(mobile-first diner bill), `/demo/admin` (multi-branch dashboard), `/demo/branch`
(branch-manager live ops). Written for downstream builder agents. Follow it
literally. Where this document gives a number, use that number, not an
approximation.

Do not invent new colors, fonts, radii, or motion curves. Every value a
surface needs already exists in `app/lib/theme.ts` or `app/globals.css`
(imports: `C, R, S, SX, SHADOW, T, TX, NUM, MONO, NOIR, GLOW, MOTION, btn,
card, noirCard, field, badge`) or in `app/demo/_data.ts` (typed mock content:
`RESTAURANT, BRANCHES, PRICING_TIERS, TABLES, MENU_CATEGORIES, MENU_ITEMS,
ORDERS, TRANSACTIONS, ANALYTICS_DHAHRAN, BRANCH_SUMMARIES, STAFF`) and
`app/demo/immersive.tsx` (`useReveal`, `staggerDelay`). If a value you need is
missing from all three, that is a gap in this document, not license to
freelance a new token, stop and flag it rather than inventing one inline.

---

## 1. Design read

Nuqra is B2B2C fintech for restaurants: a flat monthly fee, not a cut of the
bill, sold to a KSA restaurant owner who has been burned by percentage-based
processors before. The diner-facing surface is a real payment moment (trust,
speed, legibility). The operator-facing surfaces are real work tools used
under service pressure (scanability, low glare, one glance = one decision).

The existing identity (`C` in theme.ts, "Slate & Cyan", Linear-clean,
off-white canvas, cyan accent) stays the base language for anything
data-dense or trust-critical. This brief does not replace it, it extends it
with a second, darker world (`NOIR` + `GLOW`) for the two surfaces where drama
earns its keep: the story you tell a prospect (landing) and the live floor
view a manager glances at under restaurant lighting (`/demo/branch`).

**Locked per surface, never mid-page:**

| Surface | Theme | Mode (impeccable vocabulary) | Why |
|---|---|---|---|
| Landing page | **Noir (dark)**, full scroll narrative | Persuade | The story surface. Cinematic, confident, the one place motion is the point. |
| `/demo/customer` | **Light** (`C.*`, existing) | Operate, trust-critical | Payment UIs read as trustworthy in light: Apple Pay sheets, Stripe checkout. A dark bill screen reads riskier under real bar/restaurant lighting glare. |
| `/demo/admin` | **Light** (`C.*`, existing), one Noir KPI strip | Operate, data-dense | Owner needs to scan numbers across branches fast. Stays visually unified with the real production `/admin` routes that already import `C`. One restrained dark band up top for the "mission control" summary, not the whole page. |
| `/demo/branch` | **Noir (dark)**, full page | Operate, live/time-pressured | A branch manager's live floor view is a kitchen-display-adjacent surface: low glare in a dim back-of-house, always-on screen. Dark is the functional choice here, not just the dramatic one. |

This is a deliberate two-world system (Slate & Cyan light, Noir dark), not
four one-off palettes. Both worlds share the same single accent hue (cyan);
Noir just uses the brighter `GLOW` variant of it for legibility on near-black.
Never introduce a second brand hue. Never flip a surface's theme partway down
its own scroll (the taste-skill "Page Theme Lock" rule).

---

## 2. Palette (exact hex, no substitutions)

### Light world (existing, unchanged — `C` in theme.ts)

| Token | Hex | Use |
|---|---|---|
| `C.canvas` | `#F6F7F9` | Page background |
| `C.surface` | `#FFFFFF` | Cards |
| `C.surfaceAlt` | `#F1F3F6` | Secondary panel |
| `C.text` | `#0E1116` | Primary ink |
| `C.muted` | `#5B6470` | Secondary ink |
| `C.faint` | `#98A0AB` | Tertiary ink |
| `C.border` / `C.borderStrong` | `#E5E8EC` / `#D2D7DE` | Hairlines |
| `C.brand` | `#0E7490` | Accent (light surfaces) |
| `C.brandTint` | `#E2F5F9` | Active/hover chip fill |
| `C.ink` / `C.inkSoft` | `#0D0F13` / `#1A1D23` | Dark accent bands inside a light page |

### Noir world (new — `NOIR` + `GLOW` in theme.ts)

| Token | Value | Use |
|---|---|---|
| `NOIR.canvas` | `#080A0D` | Dark-world page background (not pure black) |
| `NOIR.surface` | `#10141A` | Elevated panel |
| `NOIR.surfaceAlt` | `#161B22` | Secondary panel, table rows |
| `NOIR.glass` | `rgba(16,20,26,0.72)` | Frosted panel (`.qp-glass` class, pairs with `backdrop-filter`) |
| `NOIR.text` | `#F4F6F8` | Primary ink on dark (not pure white) |
| `NOIR.muted` | `rgba(244,246,248,0.66)` | Secondary ink |
| `NOIR.faint` | `rgba(244,246,248,0.40)` | Tertiary ink |
| `NOIR.border` / `NOIR.borderStrong` | `rgba(244,246,248,0.10)` / `0.18` | Hairlines on dark |
| `GLOW.brand` | `#22D3EE` | The accent, dark-tuned. Same hue family as `C.brand`, not a second color. |
| `GLOW.brandSoft` / `GLOW.brandRing` | `rgba(34,211,238,0.16)` / `0.35` | Glow shadows, rings |

`STATUS` (success/warn/danger/info/neutral) is unchanged and works on both
worlds — on Noir surfaces, wrap status chips in a `NOIR.surfaceAlt` pill
instead of `STATUS.x.bg` if the tint reads too pale against near-black;
otherwise use as-is.

**Never**: purple/violet gradients, a second saturated brand hue, pure
`#000000` or pure `#FFFFFF`, gray-on-gray text below 4.5:1 contrast.

---

## 3. Type scale

Two scales, one per world, same two font families throughout (`var(--font-geist)`
default body via `font-family: inherit`, Geist Mono via `MONO` for every
money figure, IBM Plex Sans Arabic auto-swaps under `html[lang="ar"]`, see
`app/globals.css`). Never introduce a third family. Never use Inter.

**Light world** — use existing `T` from theme.ts unchanged (`T.display`
48px/600, `T.h1` 30px/600, `T.h2` 20px/600, `T.h3` 15.5px/600, `T.body` 15px,
`T.label` 13px/600 uppercase-capable, `T.caption` 12.5px).

**Noir/cinematic world** — use new `TX` from theme.ts for anything full-bleed
and scroll-driven (landing hero and section headers, `/demo/branch` KPI
strip). `TX` values are `clamp()`-based; do not hardcode a fixed px override
on top of them.

| Token | Size | Weight | Tracking | Use |
|---|---|---|---|---|
| `TX.hero` | clamp(40, 7vw, 96)px | 700 | -0.04em | The one big landing statement, max 2 lines |
| `TX.display` | clamp(30, 4.2vw, 56)px | 700 | -0.035em | Section headlines |
| `TX.statFigure` | clamp(44, 6vw, 108)px | 600 | -0.045em | Hero metric numbers, always wrapped in `MONO` too |
| `TX.eyebrow` | 12.5px | 700 | 0.16em uppercase | Section labels — max 1 per 3 sections, see §7 |

Body copy inside Noir sections is still 15-18px, `NOIR.muted`, `line-height:
1.6`, same rhythm as the light world's body text. Cinematic scale is for
headlines and stat figures only, never paragraph text.

**Italic**: not used anywhere in this system. No serif is used anywhere in
this system (per taste-skill serif discipline, this brand has no editorial/
luxury-publication justification for one).

---

## 4. Spacing scale

8pt rhythm, unchanged base (`S[1..8]` = 4/8/12/16/24/32/48/64), extended with
two cinematic section-level steps in `SX` (`SX[9]` = 96, `SX[10]` = 140).
`SX[1..8] === S[1..8]`, so `SX` is safe to import everywhere `S` is used
today plus the two new steps.

- Component-internal padding: `S[3]`-`S[5]` (12-24px).
- Card padding: `S[5]` (24px), matches `card()`/`noirCard()` defaults.
- Section vertical padding, light world: `S[7]`-`S[8]` (48-64px), unchanged
  from the existing marketing page.
- Section vertical padding, Noir/cinematic world: `SX[9]`-`SX[10]` (96-140px)
  on desktop, collapsing to `S[7]` (48px) under 768px. Cinematic sections need
  more room to breathe than the data-dense light world does.
- Max content width: 1120px (matches the existing `MarketingView` convention),
  except full-bleed hero/imagery layers which may run edge-to-edge with the
  1120px column centered inside.

---

## 5. Radius

One scale, unchanged (`R` in theme.ts: `xs`5 `sm`8 `md`10 `lg`14 `xl`20
`pill`999). Buttons always `R.md` (soft, never pill, matches `btn()`). Cards
`R.lg`. Large hero panels/device frames may use `R.xl`. Chips/badges/live-dot
use `R.pill`. Do not mix radius scales within one surface (shape consistency
lock).

---

## 6. Motion vocabulary

Exact durations and curves live in `MOTION` (theme.ts) and are already baked
into the `.qp-*` classes below (globals.css) — reference the class, do not
hand-roll a `transition` string that duplicates one.

| Pattern | Class | Duration | Curve | Use |
|---|---|---|---|---|
| Fade up | `.qp-reveal-up` | 560ms | `MOTION.ease` (`cubic-bezier(0.16,1,0.3,1)`) | Default scroll-reveal for any block |
| Slide from reading-start | `.qp-reveal-left` | 560ms | same | Text blocks entering from the margin (auto-mirrors under `dir="rtl"`) |
| Slide from reading-end | `.qp-reveal-right` | 560ms | same | Paired visual/device entering opposite the text |
| Scale-fade | `.qp-reveal-scale` | 560ms | same | Hero art, stat cards, anything that should feel like it "arrives" |
| Stagger step | `.qp-delay-1` … `.qp-delay-6` | +70ms/step | — | Apply alongside a reveal class inside a list/grid; index via `staggerDelay(i)` from `immersive.tsx` |
| Live pulse | `.qp-glow-pulse` | 2.4s loop | `cubic-bezier(0.4,0,0.6,1)` | Exactly one live/active indicator per screen (e.g. "Table 3 — live"), never decorative |
| Marquee | `.qp-marquee` / `.qp-marquee-track` | 28s loop | linear | **Max one per page.** Duplicate the track content 2x for a seamless loop (`translateX(-50%)` target). Auto-mirrors under `dir="rtl"`. Pauses on hover. |
| Glass panel | `.qp-glass` | — | — | `backdrop-filter: blur(20px) saturate(160%)`, solid fallback under `prefers-reduced-transparency` |
| Glow ring / text | `.qp-glow-ring` / `.qp-glow-text` | — | — | Static glow (no animation) for CTAs/hero art on Noir surfaces |
| Count-up target | `.qp-count` | — | — | Wrap the digits your JS animates; guarantees tabular figures so width never jitters mid-count |

**Hook**: `useReveal()` from `app/demo/immersive.tsx` returns `{ ref,
className }`. Spread onto the element carrying a `.qp-reveal-*` class:
`<div ref={ref} className={`qp-reveal-up ${className}`}>`. It already
degrades to instantly-visible under `prefers-reduced-motion` (no observer is
even attached), on top of the CSS-level reduced-motion collapse already in
globals.css. Do not build a second reduced-motion path.

**Motion must be motivated.** Every animation on a page needs a one-sentence
reason (hierarchy, storytelling, feedback, or state change). No animation
"because Noir should feel alive." If you cannot state the reason, cut it.

---

## 7. Section-count guardrails (apply to every surface below)

- **Eyebrows** (`TX.eyebrow` / `T.label` uppercase labels above a headline):
  max 1 per 3 sections on a page. Hero counts as 1.
- **No 3-equal-card feature grids.** Use the varied bento/zigzag/editorial-row
  patterns already established in `MarketingView.tsx` (featured band + bento,
  hairline definition lists) as the house style, extend it, do not flatten it
  back into generic 3-up cards.
- **Zigzag alternation cap**: max 2 consecutive image+text-split sections
  before switching layout family.
- **One marquee max, whole page.**
- **No pill "AI-Powered" badges, no gradient-mesh hero background, no version
  labels (`v0.6`, `BETA`), no section-number eyebrows (`01 / Solutions`), no
  decorative colored dots, no scroll cue text** ("Scroll to explore"). These
  are AI-slop tells, not stylistic options.
- **Zero em-dashes anywhere** (headlines, eyebrows, body, captions, buttons,
  quotes, mock data labels). Use a period, comma, or restructure the sentence.
  This applies to copy written for these surfaces AND to any new mock-content
  strings added to `_data.ts` beyond what already ships there.

---

## 8. AR-first / RTL rules (all four surfaces)

1. **Logical properties only.** `margin-inline-start/end`, `padding-inline-*`,
   `inset-inline-*`, `text-align: start/end`. Never `margin-left`/`right` on
   anything that must mirror. `[dir]` on `<html>` already flips these for
   free, do not fight it with hardcoded left/right.
2. **Numbers, money, and percentages stay LTR inside RTL flow.** Wrap every
   figure in `MONO` (already does `direction: ltr; unicodeBidi: isolate`) or
   the new `.qp-count` class for JS-driven count-ups. `"+30%"` must render
   sign-first in Arabic, not reordered to `"%30+"`. This is already proven out
   in `MarketingView.tsx`'s metrics band, copy the pattern exactly.
3. **Directional icons flip.** Any chevron/arrow implying navigation direction
   (next, back, "see how it works") must mirror under `dir="rtl"` — either a
   CSS `transform: scaleX(-1)` gated on `[dir="rtl"]`, or swap to the mirrored
   glyph. Icons that are not directional (checkmarks, a plus, a QR glyph)
   never flip.
4. **Reveal directions mirror automatically.** `.qp-reveal-left` /
   `.qp-reveal-right` already flip under `[dir="rtl"]` in globals.css. Do not
   add a second manual RTL override on top.
5. **Marquee direction mirrors automatically** (`.qp-marquee-track` under
   `[dir="rtl"]` uses the RTL keyframe). Do not hardcode `translateX`.
6. **Split hero / device-right compositions do not survive a CSS-only flip**
   if the "device" is an image with a baked-in subject placement. Every hero
   device render in this system is a real rendered component (like the
   existing `billPreview` block in `MarketingView.tsx`), not a photo, so it
   naturally re-flows under `flex-direction: row-reverse` / grid
   `direction: rtl`. Keep it that way, never swap to a static image asset for
   the hero device.
7. **Bilingual data**: `_data.ts` stores `{ en, ar }` pairs (`Bilingual`
   type). Render `locale === "ar" ? item.name.ar : item.name.en` (or the
   project's existing `t()`/`useT()` helper for UI chrome strings, `_data.ts`
   content is not routed through `t()`, it is content data, not UI copy).
8. **Font swap is automatic**: `html[lang="ar"] body` already switches to
   `var(--font-ar)` (IBM Plex Sans Arabic) in globals.css. Never hardcode
   Geist on Arabic text.

---

## 9. Copy tone

- No em-dashes, anywhere, ever (see §7). Use a period or comma.
- No filler verbs: "elevate," "seamless," "unleash," "revolutionize," "next-gen."
- No fake-precise numbers unless they come from `_data.ts` mock data or are
  explicitly labeled as illustrative (the real `MarketingView.tsx` metrics
  band already does this: "An illustrative model... your numbers will vary").
- Concrete over abstract. "Diners scan, split, and pay in under 30 seconds,"
  not "Transform your restaurant experience."
- Arabic copy is a real translation, not a transliteration of the English
  sentence structure. Short, direct Gulf-register business Arabic (matches
  the existing `ar-marketing.ts` dictionary tone), not Modern Standard Arabic
  formality creep.
- One CTA intent per repeated label. "Start free trial" appears in nav, hero,
  and footer verbatim (already the pattern in `MarketingView.tsx`), never
  paraphrased into "Get started" in one spot and "Try it free" in another.

---

## 10. Per-surface blueprints

### 10.1 Landing page (Noir, full scroll narrative)

Extends/replaces the current `MarketingView.tsx` sections. Keep the existing
proven structural moves (featured band + bento, hairline metrics ledger,
hairline FAQ definition lists) — reskin them onto `NOIR`, do not throw the
information architecture away.

1. **Hero** — `NOIR.canvas` background, `TX.hero` headline (max 2 lines: name
   the actual product, e.g. "QR payments for restaurants. Get paid before
   they leave the table."), subhead ≤ 20 words in `NOIR.muted`, one primary
   CTA (`btn("primary")` reskinned onto `GLOW.brand`) + one quiet text link
   (`"See how it works"`, scrolls to Solutions). Real rendered device art on
   the trailing side (reuse/evolve the existing `billPreview` component
   pattern, now sitting on `NOIR.surface` with a `.qp-glow-ring`). Hero top
   padding capped at `S[6]` (32px, honors the "hero fits the viewport" rule)
   before the headline. Max 4 text elements total (eyebrow OR nothing,
   headline, subhead, CTA row). No trust micro-strip, no version badge.
2. **Logo/trust strip** — directly under the hero, not inside it. Real POS
   partner marks (Foodics etc, from `RESTAURANT.posIntegration` and the
   existing FAQ copy about "27+ POS systems") as SVG, on `NOIR.surfaceAlt`.
   This is the one place a `.qp-marquee` is allowed if the mark count exceeds
   ~6; otherwise a static row.
3. **Solutions** — the existing featured-band + bento structure
   (`.qp-solution` cards), reskinned: featured band gets `.qp-glass` over a
   subtle `GLOW.brandSoft` radial, bento cells alternate `NOIR.surface` and
   `NOIR.surfaceAlt` (never two adjacent cells identical, per bento
   background-diversity rule). Reveal each cell with `.qp-reveal-up` staggered
   via `staggerDelay(i)`.
4. **Live table strip** — new section, pulls directly from `TABLES` (Dhahran
   branch): a horizontal row of table state chips (`available` /
   `bill_requested` / `paid` etc, using `STATUS` colors on `NOIR.surfaceAlt`
   chips) proving the product is real, not illustrative. One chip carries
   `.qp-glow-pulse` (the actively-paying table) as the single live indicator.
5. **Metrics band** — the existing ink-panel ledger pattern from
   `MarketingView.tsx`, now natively Noir (it already used `C.ink`, so this
   is close to a straight port). Hero figure uses `TX.statFigure` +
   `.qp-count` wrapping, driven by `useReveal()` to trigger the count-up on
   scroll-into-view. Source figures stay `SITE.metrics` (unchanged).
6. **Pricing** — new section using `PRICING_TIERS` from `_data.ts`. Three
   cards (Starter/Growth/Scale), Growth marked `popular: true`, use `C.brand`
   solid fill for the "Popular" tag exactly as `MarketingView.tsx` already
   does for the "Paid" badge (no new accent hue). Reveal with
   `.qp-reveal-scale`, staggered.
7. **Objections / FAQ** — port the existing hairline `<dl>` pattern verbatim
   onto Noir borders (`NOIR.border` instead of `C.border`). Do not redesign
   this pattern, it already satisfies the "long lists need the right
   component" rule.
8. **Footer CTA** — same structure as current (`btn("primary")` + secondary
   text button, legal links), Noir palette, no new content pattern.

### 10.2 `/demo/customer` (light, mobile-first diner bill)

Route target: `app/demo/customer/page.tsx` (not built in this task; this is
the brief for whoever builds it). Mobile-first: design the 390px layout
first, scale up as a secondary concern, this is the primary use case (a diner
scanning a table QR on their own phone).

1. **Header** — restaurant identity strip: `RESTAURANT.name` (bilingual),
   table number + guest count from a selected `TABLES` entry (e.g. `t_dh_3`,
   `state: "ordered"`), `C.canvas` background, no nav chrome (this is a
   scanned link, not a site).
2. **Live itemized bill** — list built from the matching `ORDERS` entry's
   `items`, each resolved against `MENU_ITEMS` for bilingual name + price.
   Money in `MONO`. This section is the trust core of the whole surface: high
   contrast, generous touch targets (44px min row height), no motion beyond a
   subtle `.qp-reveal-up` on first paint.
3. **Split control** — even / by-item / full, matches `SplitType` from
   `_data.ts`. Segmented control using `btn("secondary")`/`btn("primary")`
   toggle states, `R.md`, `S[2]` gaps between segments (44px touch targets).
4. **Tip selector** — percentage chips (`STATUS`-free, just `C.brand` active
   state) plus custom amount. Selecting a chip gets a `.qp-reveal-scale`
   micro-pop on the updated total (motivated: confirms the total changed).
5. **Total + pay** — `TX.statFigure` is too large here (mobile bill context,
   not a cinematic surface), use `T.display` (48px) for the total in `MONO`,
   full-width `btn("primary", { size: "lg", full: true })` labeled with the
   live total exactly like the existing hero `billPreview`'s pay button
   pattern (`"Pay"` + isolated `MONO` amount).
6. **Payment method row** — `mada` / `visa` / `applepay` / `stcpay` icons (SVG
   only, from an approved icon set, never hand-rolled brand marks) matching
   `Transaction.method` values.
7. **Confirmation state** — post-pay: checkmark, digital receipt line items
   again (already-paid view), matches the existing "Digital receipts" promise
   from the landing FAQ. No confetti/celebration animation beyond a single
   `.qp-reveal-scale` on the confirmation icon (motivated: state transition
   feedback, not decoration).

### 10.3 `/demo/admin` (light, multi-branch dashboard, one Noir KPI strip)

Route target: `app/demo/admin/page.tsx`. Data-dense, Operate mode: brand
expression recedes, scanability leads. Reuses the real `/admin` shell
conventions (`qp-admin-shell`, `qp-sidebar` classes already in globals.css)
so this demo visually matches the production admin the moment it graduates.

1. **KPI strip** (the one Noir band on this page) — `NOIR.canvas` full-width
   band at the top of the content area, three to four stat tiles pulling from
   `BRANCH_SUMMARIES` (revenue MTD summed, average tip %, table turns today)
   plus a mini sparkline from `ANALYTICS_DHAHRAN`. `TX.statFigure` at a
   reduced clamp ceiling is fine here, or drop to `T.display` if the tile
   grid is tight, whichever keeps 3-4 tiles on one row at 1280px without
   wrapping mid-figure.
2. **Branch comparison table** — `BRANCHES` × `BRANCH_SUMMARIES` joined by
   `branchId`. Real `<table>` markup (sortable-table pattern), not a card
   grid, this is genuinely tabular data. `C.surface` rows, `C.border`
   hairlines, tier shown as a `badge()`-style chip.
3. **Revenue trend chart** — `ANALYTICS_DHAHRAN` as a line/area chart. Follow
   the chart guardrails from ui-ux-pro-max's `ux`/`chart` domain: legend
   visible, tooltip on hover, locale-aware SAR formatting, accessible-contrast
   line color (`C.brand` on `C.surface`), no animation longer than `MOTION.base`
   on entrance and it must respect reduced-motion.
4. **Live orders feed** — `ORDERS` filtered to `status !== "closed"`, each row
   showing table number, guest count, running total (`MONO`), status
   (`STATUS` badge). This is the connective tissue to `/demo/branch`: same
   data, denser/summarized view here versus the full floor view there.
5. **Staff panel** — `STAFF` grouped by branch, role badges, invited vs
   active state (`STATUS.neutral` vs `STATUS.success`).

### 10.4 `/demo/branch` (Noir, full page, live mission-control)

Route target: `app/demo/branch/page.tsx`. This is the branch manager's
always-on floor screen: low glare, high legibility at a glance, genuinely
live-feeling (not just dark for drama). Single branch context (default to
`br_dhahran`, the pilot).

1. **Status bar** — branch name (`Bilingual`), current time, table
   occupancy summary ("9 / 14 tables"), `NOIR.canvas`, `TX.eyebrow` scale
   labels, `NOIR.border` bottom hairline. No page nav chrome beyond this,
   it is a kiosk-style single-purpose screen.
2. **Floor grid** — every `TABLES` entry for the branch as a tile: table
   number, seats, `TableState` mapped to a `STATUS` color + label
   (`available`→neutral, `seated`→info, `ordered`→warn, `bill_requested`→warn
   with `.qp-glow-pulse`, `paying`→brand/`GLOW`, `paid`→success,
   `cleaning`→neutral-dim). Grid uses CSS Grid (never flex-percentage math),
   tiles on `NOIR.surface`, `R.lg`. This is the single screen where
   `.qp-glow-pulse` earns its "exactly one live indicator" budget per
   *tile that needs it*, not per page (a floor view legitimately has several
   simultaneous "needs attention" tables, that is the point of the screen).
3. **Ticket rail** — `ORDERS` for the branch as a vertical scroll rail
   (`.qp-scroll-x`-style overflow pattern flipped to vertical), each ticket
   showing items resolved from `MENU_ITEMS`, elapsed time since `openedAt`
   (compute client-side, do not hardcode), `NOIR.surfaceAlt` cards.
4. **Revenue-today strip** — bottom-anchored, `TX.statFigure` today's running
   total (`.qp-count` + `MONO`), computed from `TRANSACTIONS` filtered to the
   branch and today's date, small delta vs yesterday using `ANALYTICS_DHAHRAN`.
5. **No decorative motion.** Every animated element here is functional state
   (a table flipping state, a new ticket arriving, the pulse on a table that
   needs attention). This is the strictest surface in the system for the
   "motion must be motivated" rule, because it is a working tool someone
   glances at for two seconds at a time.

---

## 11. Accessibility (all four surfaces)

- Contrast: 4.5:1 body text minimum on both worlds (`NOIR.muted` at
  `rgba(244,246,248,0.66)` on `NOIR.canvas`/`NOIR.surface` already clears
  this, do not lower the alpha further for "subtlety").
- Touch targets ≥44×44px everywhere, especially `/demo/customer` (tip chips,
  split toggle, pay button) and `/demo/branch` (floor tiles are also tap
  targets if the manager taps a table to see its ticket).
- `prefers-reduced-motion` collapses every animation class already listed in
  §6 to instant/static, this is already wired in globals.css, builders must
  not reintroduce motion outside these classes that skips the guard.
- Focus-visible rings are already global (`a:focus-visible` etc in
  globals.css) and work on both worlds since the ring color (`#0E7490`) has
  sufficient contrast against both `C.canvas` and `NOIR.canvas`. Do not
  override `outline: none` anywhere.
- Every icon-only control needs `aria-label`. Every status conveyed by color
  (table state, transaction status) also needs a text label or icon, never
  color alone.

---

## 12. Pre-flight checklist for every surface built from this brief

- [ ] Correct theme locked for this surface per §1 table, no mid-page flip.
- [ ] Only tokens from `theme.ts` / classes from `globals.css` / data from
      `_data.ts`, nothing invented inline.
- [ ] Zero em-dashes anywhere in shipped copy.
- [ ] Eyebrow count ≤ ceil(sections / 3).
- [ ] No 3-equal-card generic grid, no AI-slop tells from §7.
- [ ] RTL verified: logical properties, mirrored icons/reveals/marquee,
      numbers stay LTR-isolated, Arabic strings are real translations.
- [ ] Every animation justified in one sentence, all gated by the shared
      `useReveal()`/`.qp-reveal-*`/reduced-motion system, nothing hand-rolled.
- [ ] Marquee count on this page ≤ 1.
- [ ] Contrast and touch-target rules from §11 hold on both light and dark
      instances of any shared component.
