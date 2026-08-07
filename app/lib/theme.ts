// Central design tokens — the single source of visual truth for Nuqra.
//
// "Paper ledger" system (the receipt is the interface): warm off-white paper
// canvas, white printed-sheet surfaces, warm near-black ink, a single deep-cyan
// accent (the tap-to-pay moment). Geist for everything, Geist Mono for ledger
// figures/IDs (--font-mono) — mono is for Latin figures ONLY, never Arabic.
// Depth comes from overlap/value shift + hairlines, not shadow spam. Two surface
// languages: sheet() (printed sheet — near-square, hairline, no lift) and card()
// (rounded, soft elevation, hover affordance). No Tailwind — inline style objects;
// these tokens keep every surface coherent. Export names are stable (C, STATUS,
// R, S, SHADOW, T, NUM, MONO, btn, card, sheet, field, badge) so all importers
// keep compiling. Pure data + helpers, no JSX.

import type { CSSProperties } from "react";

// --- Color -----------------------------------------------------------------
export const C = {
  brand: "#0E7490", // deep cyan — the SINGLE UI accent (white text passes AA 4.8:1)
  brandLight: "#1495B5", // lighter tonal step of the accent (hover/active, logo gradient)
  brandDark: "#0B5563", // deeper teal (logo gradient end)
  brandTint: "#E6F3F5", // pale accent surface for active/hover/quiet chips on paper

  // Text: warm inks on warm paper (no competing greys).
  text: "#17150F", // primary ink (warm near-black, ~16:1 on canvas)
  muted: "#5C594F", // secondary ink (passes AA on paper + surfaces, ~6.3:1)
  faint: "#8E8A7C", // tertiary / disabled-ish (non-text only)

  // Hairlines & surfaces (warm neutrals — value shift carries depth, not shadow)
  border: "#E7E4DC", // hairline
  borderStrong: "#D8D4C9", // slightly stronger warm border
  surface: "#FFFFFF", // printed sheet / card surface
  surfaceAlt: "#F3F1EB", // recessed warm surface (one step below canvas)
  canvas: "#FAF9F6", // warm paper page
  ink: "#17150F", // dark sections (sidebar band, coin tile) — same warm near-black
  inkSoft: "#2A2722", // dark-section secondary

  // Verdict pair — settlement outcome chips (declined / settled).
  roseInk: "#B42318",
  roseBg: "#FEF3F2",
  mintInk: "#067647",
  mintBg: "#ECFDF3",
} as const;

// Status palette — {fg,bg,border}. Functional (not a second brand accent):
// success green, warn amber, danger red, info uses the accent cyan. Every fg
// passes AA 4.5:1 as text on #FAF9F6. Used sparingly; never color alone (see
// Primitives.tsx Alert/Toast — always an icon + left-border accent).
export const STATUS = {
  success: { fg: "#15803D", bg: "#EAF6EE", border: "#BDE3CB" }, // ✓ ~4.8:1
  warn: { fg: "#8A5A12", bg: "#FBF1DD", border: "#ECD09A" }, // ⚠ ~6:1
  danger: { fg: "#B42318", bg: "#FEF3F2", border: "#F3C9C4" }, // ✕ ~6.3:1
  info: { fg: "#0E7490", bg: "#E6F3F5", border: "#BBDDE3" }, // i — accent cyan ~5.1:1
  neutral: { fg: "#5C594F", bg: "#F0EEE8", border: "#E0DDD4" }, // muted ink ~6.3:1
} as const;

// --- Radius (one scale — soft, not pill; buttons use md) --------------------
export const R = {
  xs: 5,
  sm: 8,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999, // reserved for small chips/badges + the live dot, not buttons
} as const;

// --- Space (8pt rhythm) ----------------------------------------------------
export const S = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
} as const;

// --- Elevation (warm-ink-tinted, reduced weight — depth by overlap/value) ---
export const SHADOW = {
  e1: "0 1px 2px rgba(23,21,15,0.04)", // barely-there
  e2: "0 2px 8px rgba(23,21,15,0.05), 0 1px 2px rgba(23,21,15,0.03)", // soft
  e3: "0 12px 32px rgba(23,21,15,0.08)", // modest
  cta: "0 1px 2px rgba(23,21,15,0.06)",
  ctaHover: "0 4px 12px rgba(23,21,15,0.10)",
} as const;

// --- Type scale (Geist display/body — paper-ledger) -------------------------
// App sizes kept; body stays small. `editorial` is the clamp-based display
// (~40-72px) for editorial landing use. NOTE: T.display.fontSize stays a number
// — Money() reads it as a numeric `size` prop.
export const T = {
  display: { fontSize: 48, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05 },
  editorial: {
    fontSize: "clamp(40px, 6vw, 72px)",
    fontWeight: 600,
    letterSpacing: "-0.03em",
    lineHeight: 1.05,
  },
  h1: { fontSize: 30, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.12 },
  h2: { fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.2 },
  h3: { fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.3 },
  body: { fontSize: 15, fontWeight: 400, lineHeight: 1.6 },
  label: { fontSize: 13, fontWeight: 600, letterSpacing: "0" },
  caption: { fontSize: 12.5, fontWeight: 500, lineHeight: 1.45 },
} as const satisfies Record<string, CSSProperties>;

/** Tabular figures (Geist) for inline counts. Latin digits only. */
export const NUM: CSSProperties = { fontVariantNumeric: "tabular-nums" };

/** Monospace ledger figures — for money/totals/IDs (the "coin" feel).
    Numbers, signs and currency are always LTR, even inside Arabic (RTL) flow:
    isolate each run so "+30%" stays sign-first and "$77.49" stays symbol-first
    instead of being reordered by the surrounding RTL context. Mono is for Latin
    figures/IDs ONLY — never Arabic text. */
export const MONO: CSSProperties = {
  fontFamily: "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "-0.01em",
  direction: "ltr",
  unicodeBidi: "isolate",
};

// --- Style helpers ---------------------------------------------------------
// Return plain CSSProperties to spread into inline `style`. Hover/active live in
// globals.css via the `qp-*` class hooks (inline can't express pseudo-classes).

export type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "success";

export function btn(
  variant: BtnVariant = "primary",
  opts: { size?: "sm" | "md" | "lg"; full?: boolean; disabled?: boolean } = {},
): CSSProperties {
  const { size = "md", full = false, disabled = false } = opts;
  const pad =
    size === "lg" ? "14px 22px" : size === "sm" ? "8px 13px" : "10px 17px";
  const fontSize = size === "lg" ? 15.5 : size === "sm" ? 13 : 14;
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: pad,
    borderRadius: R.md, // soft, not pill
    fontFamily: "inherit",
    fontSize,
    fontWeight: 600,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.55 : 1,
    width: full ? "100%" : undefined,
    transition: "transform .22s cubic-bezier(0.16,1,0.3,1), box-shadow .22s, background .22s, border-color .22s",
    border: "1px solid transparent",
    lineHeight: 1,
  };
  switch (variant) {
    case "primary":
      return { ...base, background: C.brand, color: "#fff", boxShadow: SHADOW.cta };
    case "secondary":
      return { ...base, background: C.surface, color: C.text, borderColor: C.borderStrong };
    case "ghost":
      return { ...base, background: "transparent", color: C.brand, borderColor: "transparent" };
    case "danger":
      return { ...base, background: C.surface, color: STATUS.danger.fg, borderColor: STATUS.danger.border };
    case "success":
      return { ...base, background: C.brand, color: "#fff" };
  }
}

/** Printed-sheet surface — near-square radius, 1px hairline, white fill, NO
 *  hover lift. The "receipt line item" language: depth comes from the hairline
 *  + value shift against the paper canvas, never elevation. */
export function sheet(opts: { pad?: number; radius?: number } = {}): CSSProperties {
  const { pad = S[4], radius = R.xs } = opts;
  return {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: radius,
    padding: pad,
  };
}

/** Card surface — rounded (12-16px), soft e1-e2 elevation, subtle hover
 *  affordance (via qp-* class hooks in globals). The interactive-panel language. */
export function card(opts: { pad?: number; radius?: number; elevated?: boolean } = {}): CSSProperties {
  const { pad = S[5], radius = R.lg, elevated = false } = opts;
  return {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: radius,
    padding: pad,
    boxShadow: elevated ? SHADOW.e2 : SHADOW.e1,
  };
}

export function field(): CSSProperties {
  return {
    width: "100%",
    padding: "11px 13px",
    // Input border must reach 3:1 vs the white fill (WCAG 1.4.11 non-text
    // contrast) since the border is the only thing delimiting the control.
    border: `1px solid #8A8475`,
    borderRadius: R.sm,
    fontFamily: "inherit",
    fontSize: 15,
    color: C.text,
    background: C.surface,
    outline: "none",
  };
}

/** Status badge style from a STATUS key. */
export function badge(kind: keyof typeof STATUS): CSSProperties {
  const s = STATUS[kind];
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.03em",
    textTransform: "uppercase",
    padding: "3px 9px",
    borderRadius: R.pill,
    color: s.fg,
    background: s.bg,
    border: `1px solid ${s.border}`,
  };
}

// =============================================================================
// IMMERSIVE EXTENSION — additive only. Every export above this line keeps
// compiling unchanged (real /admin routes import C, S, R, T, SHADOW, MONO, btn,
// card, field, badge as-is). The tokens below are the wider spacing/motion/type
// vocabulary retained from the scroll-driven storytelling system. The former
// dark-canvas world (off-black surface, glow variant of the accent, dark card
// helper) was removed during the ui-editorial migration to the single
// paper-ledger light system.
// =============================================================================

/** Extra 8pt-rhythm steps for section-level (not component-level) spacing on
 *  immersive surfaces. Spreads S so SX[1..8] === S[1..8]; S itself is
 *  untouched (no mutation of an existing export). */
export const SX = { ...S, 9: 96, 10: 140 } as const;

// --- Motion vocabulary (exact durations/eases, named) -----------------------
// `ease` matches the curve already used across qp-cta/qp-solution/qp-reveal in
// globals.css, so new and old motion feel like one system.
export const MOTION = {
  fast: "180ms",
  base: "320ms",
  slow: "560ms",
  cinematic: "900ms",
  ease: "cubic-bezier(0.16,1,0.3,1)", // ease-out-quart — entrances
  easeIn: "cubic-bezier(0.4,0,1,1)", // exits
  spring: "cubic-bezier(0.34,1.56,0.64,1)", // slight overshoot — stat pops, tip chips
} as const;

/** Extended type scale for cinematic/editorial surfaces (landing, /demo/branch
 *  hero band). T{h1..caption} above is untouched and still governs the
 *  Linear-clean data-dense surfaces (admin, customer bill). Sizes use clamp()
 *  because these surfaces are full-bleed scroll narratives, not fixed cards. */
export const TX = {
  hero: {
    fontSize: "clamp(40px, 7vw, 96px)",
    fontWeight: 700,
    letterSpacing: "-0.04em",
    lineHeight: 0.98,
  },
  display: {
    fontSize: "clamp(30px, 4.2vw, 56px)",
    fontWeight: 700,
    letterSpacing: "-0.035em",
    lineHeight: 1.04,
  },
  statFigure: {
    fontSize: "clamp(44px, 6vw, 108px)",
    fontWeight: 600,
    letterSpacing: "-0.045em",
    lineHeight: 0.92,
  },
  eyebrow: {
    fontSize: 12.5,
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
  },
} as const satisfies Record<string, CSSProperties>;

