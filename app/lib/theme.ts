// Central design tokens — the single source of visual truth for Nuqra.
//
// Ground-up "Slate & Ember" system (Linear-clean minimal): cool off-white canvas,
// cool near-black ink, a single burnt-ember accent (the coin / the tap-to-pay
// moment). Geist for everything, Geist Mono for ledger figures (--font-mono).
// Cool neutral scaffolding + one warm accent = minimal structure, human warmth.
// No Tailwind — everything is inline style objects; these tokens keep every
// surface coherent. Export names are stable (C, STATUS, R, S, SHADOW, T, NUM,
// MONO, btn, card, field, badge) so all importers keep compiling. Pure data +
// helpers, no JSX.

import type { CSSProperties } from "react";

// --- Color -----------------------------------------------------------------
export const C = {
  brand: "#C2410C", // burnt ember — the single accent (white text passes AA)
  brandLight: "#E2592A",
  brandDark: "#9A3412",
  brandTint: "#FBEEE7", // pale ember surface for active/hover/quiet chips

  // Text: three cool inks (no competing greys).
  text: "#0E1116", // primary (cool near-black)
  muted: "#5B6470", // secondary (passes AA on canvas + surfaces)
  faint: "#98A0AB", // tertiary / disabled-ish

  // Borders & surfaces (cool neutrals)
  border: "#E5E8EC",
  borderStrong: "#D2D7DE",
  surface: "#FFFFFF",
  surfaceAlt: "#F1F3F6",
  canvas: "#F6F7F9", // cool off-white page
  ink: "#0D0F13", // dark sections (sidebar, hero band, coin tile)
  inkSoft: "#1A1D23",
} as const;

// Status palette — {fg,bg,border}. These are functional (not a second brand
// accent): success green, warn amber, danger rose (hue-separated from the ember
// brand), info/neutral slate. Used sparingly.
export const STATUS = {
  success: { fg: "#15734F", bg: "#E7F4EE", border: "#B6DECB" },
  warn: { fg: "#8A5A12", bg: "#FBF3E4", border: "#EBCF94" },
  danger: { fg: "#C02B3A", bg: "#FCEBED", border: "#F0B8BF" },
  info: { fg: "#3D4651", bg: "#EEF0F3", border: "#DCE0E6" }, // neutral slate, not a 2nd accent
  neutral: { fg: "#5B6470", bg: "#EFF1F4", border: "#E5E8EC" },
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

// --- Elevation (cool-tinted, subtle, never pure black) ----------------------
export const SHADOW = {
  e1: "0 1px 2px rgba(13,15,19,0.06)",
  e2: "0 4px 16px rgba(13,15,19,0.06), 0 1px 3px rgba(13,15,19,0.04)",
  e3: "0 20px 48px rgba(13,15,19,0.12)",
  cta: "0 2px 6px rgba(13,15,19,0.10)",
  ctaHover: "0 8px 20px rgba(13,15,19,0.16)",
} as const;

// --- Type scale (Geist display/body — Linear-clean) -------------------------
export const T = {
  display: { fontSize: 48, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05 },
  h1: { fontSize: 30, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.12 },
  h2: { fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.2 },
  h3: { fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.3 },
  body: { fontSize: 15, fontWeight: 400, lineHeight: 1.6 },
  label: { fontSize: 13, fontWeight: 600, letterSpacing: "0" },
  caption: { fontSize: 12.5, fontWeight: 500, lineHeight: 1.45 },
} as const satisfies Record<string, CSSProperties>;

/** Tabular figures (Geist) for inline counts. */
export const NUM: CSSProperties = { fontVariantNumeric: "tabular-nums" };

/** Monospace ledger figures — for money/totals/amounts (the "coin" feel). */
export const MONO: CSSProperties = {
  fontFamily: "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "-0.01em",
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
    borderRadius: R.md, // soft, not pill — Linear-clean
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

export function card(opts: { pad?: number; radius?: number; elevated?: boolean } = {}): CSSProperties {
  const { pad = S[5], radius = R.lg, elevated = false } = opts;
  return {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: radius,
    padding: pad,
    boxShadow: elevated ? SHADOW.e2 : undefined,
  };
}

export function field(): CSSProperties {
  return {
    width: "100%",
    padding: "11px 13px",
    border: `1px solid ${C.borderStrong}`,
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
