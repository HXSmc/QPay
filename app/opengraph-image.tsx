import { ImageResponse } from "next/og";

// Paper-ledger OG identity: warm paper canvas, warm-ink wordmark (Nuqra / نقرة),
// a small deep-cyan ledger rule as the receipt/accent motif. Public link
// preview surface. The bright logo cyan (#22D3EE) is NOT used here because this
// renders the wordmark as text, not the real Logo component (per the cyan rule).
// Accent is the UI accent #0E7490 only. System fonts only, so this stays static
// and dependency-free.
export const alt = "Nuqra - QR payments for restaurants";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#FAF9F6",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* ledger rule - the single deep-cyan accent / receipt motif */}
        <div
          style={{ display: "flex", width: "120px", height: "6px", background: "#0E7490", borderRadius: "3px", marginBottom: "40px" }}
        />
        <div style={{ display: "flex", alignItems: "baseline", gap: "28px" }}>
          <span style={{ fontSize: "108px", fontWeight: 700, color: "#17150F", letterSpacing: "-2px" }}>
            Nuqra
          </span>
          <span style={{ fontSize: "108px", fontWeight: 700, color: "#17150F" }}>نقرة</span>
        </div>
        <div style={{ display: "flex", marginTop: "28px" }}>
          <span style={{ fontSize: "36px", color: "#0E7490" }}>
            QR payments for restaurants. Scan, split, tip, pay.
          </span>
        </div>
        {/* receipt hairline motif (paper ledger) */}
        <div
          style={{ display: "flex", marginTop: "48px", width: "440px", borderTop: "2px solid #E7E4DC" }}
        />
      </div>
    ),
    { ...size }
  );
}
