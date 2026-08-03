import { ImageResponse } from "next/og";

export const alt = "Nuqra — QR payments for restaurants";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// System fonts only (no remote font fetch) — keeps this static and dependency-free.
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
          background: "#0E1116",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", width: "96px", height: "8px", background: "#22D3EE", borderRadius: "4px", marginBottom: "40px" }} />
        <div style={{ display: "flex", alignItems: "baseline", gap: "28px" }}>
          <span style={{ fontSize: "108px", fontWeight: 700, color: "#FFFFFF", letterSpacing: "-2px" }}>
            Nuqra
          </span>
          <span style={{ fontSize: "108px", fontWeight: 700, color: "#FFFFFF" }}>نقرة</span>
        </div>
        <div style={{ display: "flex", marginTop: "28px" }}>
          <span style={{ fontSize: "36px", color: "#22D3EE" }}>
            QR payments for restaurants — scan, split, tip, pay
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
