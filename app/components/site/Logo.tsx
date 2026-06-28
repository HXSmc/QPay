// Nuqra logo (Nuqra = a silver coin, Arabic). A coin mark: a brand-blue tile
// holding a struck silver coin with an "N" monogram cut into its face. Speaks
// money + identity in one ownable mark. Used in the marketing header, admin
// sidebar, login, and as the favicon (app/icon.svg mirrors this geometry).

import { C } from "../../lib/theme";

export function LogoMark({
  size = 30,
  onDark = false,
  radius = 9,
}: {
  size?: number;
  onDark?: boolean;
  radius?: number;
}) {
  const tile = `qp-tile-${size}-${onDark ? "d" : "l"}`;
  const silver = `qp-silver-${size}-${onDark ? "d" : "l"}`;
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
          <stop stopColor={C.brand} />
          <stop offset="1" stopColor={C.brandDark} />
        </linearGradient>
        <linearGradient id={silver} x1="7" y1="6" x2="25" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F4F7FB" />
          <stop offset="0.5" stopColor="#D7DEE8" />
          <stop offset="1" stopColor="#AEB9C9" />
        </linearGradient>
      </defs>
      {/* brand tile */}
      <rect width="32" height="32" rx="8" fill={`url(#${tile})`} />
      {/* struck silver coin */}
      <circle cx="16" cy="16" r="9.2" fill={`url(#${silver})`} />
      <circle cx="16" cy="16" r="9.2" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="0.8" />
      {/* milled inner rim */}
      <circle cx="16" cy="16" r="6.9" stroke={C.brandDark} strokeOpacity="0.25" strokeWidth="0.9" fill="none" />
      {/* N monogram struck into the coin */}
      <path
        d="M12.6 20.2 V11.8 L19.4 20.2 V11.8"
        stroke={C.brandDark}
        strokeWidth="2.1"
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
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color,
        }}
      >
        Nuqra
      </span>
    </span>
  );
}
