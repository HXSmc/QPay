"use client";

import { BRAND } from "../../../lib/data";

const WEEK = [
  { d: "Mon", v: 62 },
  { d: "Tue", v: 48 },
  { d: "Wed", v: 71 },
  { d: "Thu", v: 80 },
  { d: "Fri", v: 100 },
  { d: "Sat", v: 94 },
  { d: "Sun", v: 57 },
];

const STATS = [
  { label: "Revenue this week", value: "$28,410" },
  { label: "Avg. ticket size", value: "$64.20" },
  { label: "Tips rate", value: "18.4%" },
  { label: "Repeat diners", value: "37%" },
];

export default function AnalyticsPage() {
  return (
    <div style={{ padding: "30px 36px" }}>
      <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
        Analytics
      </h1>
      <p style={{ fontSize: 14, color: "#64748B", margin: "5px 0 24px", fontWeight: 600 }}>
        Revenue and tipping trends across the week.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, marginBottom: 24 }}>
        {STATS.map((s) => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 18, padding: 20 }}>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>{s.value}</div>
            <div style={{ fontSize: 13.5, color: "#64748B", fontWeight: 600, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 18, padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 20px" }}>Daily revenue</h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 200 }}>
          {WEEK.map((w) => (
            <div key={w.d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: "100%",
                  height: `${w.v}%`,
                  background: `linear-gradient(180deg, ${BRAND}, #5B7BFF)`,
                  borderRadius: "8px 8px 0 0",
                  minHeight: 6,
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>{w.d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
