// Nuqra logo. Two overlapping paper receipt slips with torn (zigzag) bottom
// edges, offset diagonally so the white channel left between them draws the
// letter N - payments made physical, the artifact the product replaces.
//
// Hand-traced to real paths from the approved concept art: no <text>, no font
// dependency, no gradient. app/icon.svg mirrors this geometry exactly.

import { C } from "../../lib/theme";

/** Upper-left slip. Straight top and left edges, torn bottom, N-cut on the right. */
const SLIP_BACK =
  "M25.57,2.00L47.41,11.80L34.35,34.65L32.31,23.02L28.63,21.18L16.39,42.41" +
  "L15.57,39.55L12.71,40.78L12.31,37.71L9.24,39.35L9.04,36.49L6.39,36.08Z";

/** Lower-right slip. Sits under the first; its peak closes the N's diagonal. */
const SLIP_FRONT =
  "M47.20,20.37L57.61,26.69L35.37,62.00L34.96,59.14L32.10,60.16L31.90,57.31" +
  "L29.04,58.33L28.63,55.27L25.78,56.29L25.57,53.43L22.51,54.24L22.31,51.39" +
  "L19.45,52.41L19.04,49.35L16.39,50.16L29.04,29.55L30.88,40.78L34.35,42.82Z";

export function LogoMark({
  size = 30,
  onDark = false,
  decorative = false,
}: {
  size?: number;
  /** Ink surfaces (sidebar, dark bands) need the light half of the palette -
   *  the default two cyans both disappear against near-black. */
  onDark?: boolean;
  /** When the mark sits next to the "Nuqra" wordmark, hide it from a11y so the
   *  accessible name isn't "Nuqra Nuqra" (label-content-name-mismatch). */
  decorative?: boolean;
}) {
  const [back, front] = onDark
    ? [C.brandTint, C.brandLight]
    : [C.brand, C.brandDark];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "Nuqra"}
      aria-hidden={decorative ? true : undefined}
      style={{ display: "block", flexShrink: 0 }}
    >
      <path d={SLIP_BACK} fill={back} />
      <path d={SLIP_FRONT} fill={front} />
    </svg>
  );
}

export function Wordmark({
  size = 19,
  markSize = 30,
  color = C.text,
  onDark = false,
}: {
  size?: number;
  markSize?: number;
  color?: string;
  onDark?: boolean;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <LogoMark size={markSize} onDark={onDark} decorative />
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
