# Nuqra Design Direction

Nuqra is B2B2C fintech for restaurants: a flat monthly fee, not a cut of the
bill, sold to a KSA restaurant owner who has been burned by percentage-based
processors before. The diner surface is a real payment moment (trust, speed,
legibility). The operator surfaces are real work tools used under service
pressure (scanability, low glare, one glance = one decision).

## One light system: paper ledger

There is a single visual system now. The earlier two-world design (a light
"Slate & Cyan" world plus a dark "Noir" world) was retired during the
ui-editorial migration. Every surface, including the landing page and the
`/demo/*` showcases, sits on the same warm paper-ledger tokens defined in
`app/lib/theme.ts`. No surface flips dark partway down a page.

The metaphor is "the receipt is the interface": a warm off-white paper canvas,
white printed-sheet surfaces, warm near-black ink, and one deep-cyan accent
(the tap-to-pay moment). Depth comes from overlap, value shift, and hairlines,
not shadow. Two surface languages live on top of the one palette: `sheet()`
(near-square, hairline, no lift, the "receipt line item") and `card()` (rounded,
soft elevation, hover affordance, the interactive panel).

## Tokens and helpers

Import from `app/lib/theme.ts`: `C` (color), `R` (radius), `S` / `SX` (space),
`SHADOW`, `T` / `TX` (type), `NUM`, `MONO`, `STATUS`, `MOTION`, and the helpers
`btn`, `card`, `sheet`, `field`, `badge`. Motion classes (`.qp-reveal-*`,
`.qp-cta`, reduced-motion collapse) live in `app/globals.css`; reference a
class, do not hand-roll a duplicate transition. Typed demo content lives in
`app/demo/_data.ts`; scroll-reveal hooks in `app/demo/immersive.tsx`. If a value
you need is missing from all three, stop and flag it rather than inventing one.

The dark-world tokens (`NOIR`, `GLOW`, `noirCard`) are gone. `GLOW.brand` no
longer exists; the single accent everywhere is `C.brand` (`#0E7490`). The bright
cyan `#22D3EE` lives only inside the `Logo`/wordmark assets and is never used in
UI chrome.

## Per-surface read

| Surface | Mode | Notes |
|---|---|---|
| Landing (`/`) | Light, scroll narrative | Persuade. Editorial sections on paper; hero receipt artifact carries the story. |
| `/demo/customer` | Light, mobile-first | Operate, trust-critical. A dark bill reads riskier under bar lighting; the printed-sheet bill reads trustworthy. |
| `/demo/admin`, real `/admin` | Light, data-dense | Operate. Scan numbers fast across branches; one ink KPI band if needed, never a full dark page. |
| `/demo/branch` | Light, live floor | Operate, time-pressured. The earlier dark "mission control" rationale is dropped; the floor view is now a paper-ledger surface with the same single accent and hairlines as everywhere else. |

## Standing rules

- One accent hue (`C.brand`). Never a second saturated brand color, never a dark
  canvas variant.
- Every figure (money, counts, IDs) in `MONO`; numbers stay LTR-isolated inside
  RTL flow.
- Logical properties only (`margin-inline-*`, `padding-inline-*`) so Arabic
  mirrors for free under `[dir="rtl"]`. Directional icons flip; non-directional
  icons never do.
- Status is never color alone: pair every status color with an icon or text
  (see `Primitives.tsx` Alert/Toast).
- Inputs use `field()` with a 3:1 border; visible focus ring; error text + icon.
- Touch targets >= 44px; body text >= 4.5:1 contrast on paper.
- Motion must be motivated (hierarchy, storytelling, feedback, state change).
  If you cannot state the reason in one sentence, cut it. Everything animates
  through the shared `.qp-reveal-*`/`useReveal()` system, which already collapses
  under `prefers-reduced-motion`.
- No em-dashes in shipped copy. Concrete over abstract. One CTA intent per
  repeated label.
