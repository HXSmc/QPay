// Nuqra logo. A modern, flat monogram: a bold "N" with a single struck dot -
// the "nuqra" itself (نقرة = a dot / a tap), which is also the tap-to-pay point.
// Reduced to one confident idea: maximally legible down to 16px, ownable, and
// it encodes the name. Used in the marketing header, admin sidebar, login, and
// as the favicon (app/icon.svg mirrors this geometry).

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
  void onDark; // background-agnostic (ember tile reads on light + dark)
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
      {/* stylised slanted N monogram (forward momentum), filled for weight */}
      <g transform="translate(2.2,0) skewX(-9)">
        <path d="M8 9 h3.4 v14 h-3.4 z" fill="#FFFFFF" />
        <path d="M15.4 9 h3.4 v14 h-3.4 z" fill="#FFFFFF" />
        <path d="M8 9 L11.4 9 L18.8 23 L15.4 23 Z" fill="#FFFFFF" />
      </g>
      {/* the nuqra - the dot / the tap */}
      <circle cx="24.4" cy="21.6" r="2.05" fill="#FFFFFF" />
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
