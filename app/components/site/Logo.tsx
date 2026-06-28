// Nuqra logo (Nuqra = a struck coin / a dot, Arabic). A burnt-ember tile holding
// a struck silver-white coin with the brand "N" struck into its face: coin =
// money, N = the brand, fused into one ownable mark. A faint milled rim gives the
// coin weight. Flat, legible down to 16px, reads on both light and dark surfaces.
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
  void onDark; // mark is background-agnostic (ember tile reads on light + dark)
  const tile = `qp-tile-${size}`;
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
      {/* struck coin */}
      <circle cx="16" cy="16" r="8.6" fill="#FFFFFF" />
      {/* milled rim */}
      <circle cx="16" cy="16" r="6.4" stroke={C.brandDark} strokeOpacity="0.16" strokeWidth="0.9" fill="none" />
      {/* N struck into the coin */}
      <path
        d="M11.6 20.4 V11.6 L20.4 20.4 V11.6"
        stroke={C.brandDark}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
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
