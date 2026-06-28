// Central design tokens — the single source of visual truth for Nuqra.
//
// The app styles everything with inline objects (no Tailwind). Before this file
// those objects were ad-hoc: 5 greys, ~12 radius values, ad-hoc shadows, no type
// scale. This module consolidates them so every surface speaks one visual
// language (Redesign-Preserve: brand blue + Plus Jakarta Sans kept). Pure data +
// style helpers — no JSX — so both Server and Client Components can import it.

import type { CSSProperties } from "react";

// --- Color -----------------------------------------------------------------
export const C = {
  brand: "#2E5BFF",
  brandLight: "#5B7BFF",
  brandDark: "#1E40FF",
  brandTint: "#EEF2FF", // pale blue surface for active/hover/info chips

  // Text: exactly three weights of ink (was five competing greys).
  text: "#0B1221", // primary
  muted: "#475569", // secondary (passes AA on white & on #F8FAFC)
  faint: "#94A3B8", // tertiary / disabled-ish

  // Borders & surfaces
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  surface: "#FFFFFF",
  surfaceAlt: "#F8FAFC",
  canvas: "#F1F5F9",
  ink: "#0B1221", // dark sections (sidebar, hero band)
  inkSoft: "#161F33",
} as const;

// Status palette — each as {fg,bg,border} so badges/alerts are consistent.
export const STATUS = {
  success: { fg: "#15803D", bg: "#F0FDF4", border: "#86EFAC" },
  warn: { fg: "#B45309", bg: "#FFFBEB", border: "#FCD34D" },
  danger: { fg: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
  info: { fg: "#1E40FF", bg: "#EEF2FF", border: "#C7D4FF" }, // was #1D4ED8 on #DBEAFE (~3:1 fail) → AA now
  neutral: { fg: "#475569", bg: "#F1F5F9", border: "#E2E8F0" },
} as const;

// --- Radius (one scale; all loose values map onto these) -------------------
export const R = {
  xs: 8,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
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

// --- Elevation (tinted, never pure black) ----------------------------------
export const SHADOW = {
  e1: "0 1px 3px rgba(15,23,42,0.06)",
  e2: "0 8px 24px rgba(11,18,33,0.08)",
  e3: "0 24px 60px rgba(11,18,33,0.14)",
  cta: "0 10px 24px rgba(46,91,255,0.30)",
  ctaHover: "0 14px 30px rgba(46,91,255,0.40)",
} as const;

// --- Type scale ------------------------------------------------------------
export const T = {
  display: { fontSize: 56, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.04 },
  h1: { fontSize: 27, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15 },
  h2: { fontSize: 20, fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.2 },
  h3: { fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.25 },
  body: { fontSize: 14.5, fontWeight: 500, lineHeight: 1.55 },
  label: { fontSize: 13, fontWeight: 700, letterSpacing: "0" },
  caption: { fontSize: 12, fontWeight: 600, lineHeight: 1.4 },
} as const satisfies Record<string, CSSProperties>;

/** Tabular figures for money / counts — keeps columns from jittering. */
export const NUM: CSSProperties = { fontVariantNumeric: "tabular-nums" };

// --- Style helpers ---------------------------------------------------------
// These return plain CSSProperties so callers spread them into inline `style`.
// Hover/active live in globals.css via the `qp-*` class hooks (inline can't do
// pseudo-classes); pair the class with these where motion is wanted.

export type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "success";

export function btn(
  variant: BtnVariant = "primary",
  opts: { size?: "sm" | "md" | "lg"; full?: boolean; disabled?: boolean } = {},
): CSSProperties {
  const { size = "md", full = false, disabled = false } = opts;
  const pad =
    size === "lg" ? "15px 22px" : size === "sm" ? "8px 14px" : "11px 18px";
  const fontSize = size === "lg" ? 16 : size === "sm" ? 13 : 14;
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: pad,
    borderRadius: R.sm,
    fontFamily: "inherit",
    fontSize,
    fontWeight: 700,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.55 : 1,
    width: full ? "100%" : undefined,
    transition: "transform .15s, box-shadow .15s, background .15s, border-color .15s",
    border: "1.5px solid transparent",
    lineHeight: 1,
  };
  switch (variant) {
    case "primary":
      return { ...base, background: C.brand, color: "#fff", boxShadow: SHADOW.cta };
    case "secondary":
      return { ...base, background: C.surface, color: C.text, borderColor: C.border };
    case "ghost":
      return { ...base, background: "transparent", color: C.brand, borderColor: "transparent" };
    case "danger":
      return { ...base, background: C.surface, color: STATUS.danger.fg, borderColor: STATUS.danger.border };
    case "success":
      return { ...base, background: STATUS.success.fg, color: "#fff" };
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
    border: `1.5px solid ${C.border}`,
    borderRadius: R.sm,
    fontFamily: "inherit",
    fontSize: 14.5,
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
    fontWeight: 800,
    letterSpacing: "0.02em",
    padding: "3px 9px",
    borderRadius: R.pill,
    color: s.fg,
    background: s.bg,
    border: `1px solid ${s.border}`,
  };
}
