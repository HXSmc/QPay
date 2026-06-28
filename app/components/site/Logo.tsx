// Nuqra logo (Nuqra = a dot / point, Arabic). A burnt-ember tile holding a
// concentric "coin / scan" mark: a solid dot (the nuqra) inside a thin ripple
// ring — reads as a struck coin and as the tap-to-pay target in one ownable,
// flat geometric mark. Linear-clean: no busy detail, legible down to 16px.
// Used in the marketing header, admin sidebar, login, and as the favicon
// (app/icon.svg mirrors this geometry).

import { C } from "../../lib/theme";

export function LogoMark({
  size = 30,
  onDark = false,
  radius = 8,
}: {
  size?: number;
  onDark?: boolean;
  radius?: number;
}) {
  const tile = `qp-tile-${size}-${onDark ? "d" : "l"}`;
  // Ring sits brighter on dark surfaces so the mark holds its weight.
  const ringOpacity = onDark ? 0.55 : 0.42;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Nuqra"
      style={{ display: "block", borderRadius: radius, flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={tile} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor={C.brandLight} />
          <stop offset="1" stopColor={C.brandDark} />
        </linearGradient>
      </defs>
      {/* ember tile */}
      <rect width="32" height="32" rx="8" fill={`url(#${tile})`} />
      {/* ripple / scan ring */}
      <circle cx="16" cy="16" r="9" stroke="#FFFFFF" strokeOpacity={ringOpacity} strokeWidth="1.3" fill="none" />
      {/* the nuqra — struck coin / tap target */}
      <circle cx="16" cy="16" r="4.4" fill="#FFFFFF" />
    </svg>
  );
}

export function Wordmark({
  size = 19,
  markSize = 30,
  color = C.text,
}: {
  size?: number;
  markSize?: number;
  color?: string;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <LogoMark size={markSize} />
      <span
        style={{
          fontSize: size,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color,
        }}
      >
        Nuqra
      </span>
    </span>
  );
}
