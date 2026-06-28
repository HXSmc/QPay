// QPay logo. A monogram fusing a "Q" (ring) with a QR/payment module (the
// rounded chip at the tail) — speaks scan + pay in one ownable mark. Brand blue.
// Used in the marketing header, admin sidebar, login, and as the favicon
// (app/icon.svg mirrors this geometry).

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
  const id = `qp-g-${size}-${onDark ? "d" : "l"}`;
  const ring = "#FFFFFF";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="QPay"
      style={{ display: "block", borderRadius: radius, flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor={C.brand} />
          <stop offset="1" stopColor={C.brandLight} />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${id})`} />
      {/* Q ring */}
      <circle cx="15" cy="15" r="7" stroke={ring} strokeWidth="3.1" fill="none" />
      {/* payment / QR module forming the Q's tail */}
      <rect x="17.5" y="17.5" width="7.5" height="7.5" rx="2.4" fill={ring} />
      <rect x="20" y="20" width="2.5" height="2.5" rx="0.8" fill={C.brand} />
      {onDark && null}
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
        QPay
      </span>
    </span>
  );
}
