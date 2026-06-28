// Nuqra logo. A modern, flat monogram: a single bold, slanted "N" - the italic
// gives forward momentum (fast payments) and the solid weight makes it
// distinctive and eye-catching while staying legible down to 16px. Used in the
// marketing header, admin sidebar, login, and as the favicon (app/icon.svg
// mirrors this geometry).

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
      {/* stylised slanted N monogram - centered, filled, bold (forward momentum) */}
      <g transform="translate(0.6,0) skewX(-9)">
        <path d="M8.8 8.5 h3.7 v15 h-3.7 z" fill="#FFFFFF" />
        <path d="M18 8.5 h3.7 v15 h-3.7 z" fill="#FFFFFF" />
        <path d="M8.8 8.5 L12.5 8.5 L21.7 23.5 L18 23.5 Z" fill="#FFFFFF" />
      </g>
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
