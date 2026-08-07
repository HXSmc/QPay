// Local literal for the ONE inverted (ink) band on the landing page (the
// closing CTA, see ClosingSection.tsx). The dark canvas tokens theme.ts used
// for the old immersive world are being retired in this migration, so this
// is a small, single-purpose light-on-dark text palette scoped to
// landing/** only, not a new global dark-mode system.
export const INK = {
  text: "#F4F6F8",
  muted: "rgba(244,246,248,0.66)",
  faint: "rgba(244,246,248,0.10)",
  border: "rgba(244,246,248,0.28)",
} as const;
