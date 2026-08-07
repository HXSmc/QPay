"use client";

// Hero device art for the immersive landing: a real, rendered diner-bill screen
// (not a photo) sitting on NOIR.surface with a .qp-glow-ring, per DIRECTION.md
// §10.1.1. Reuses the exact translated strings the existing MarketingView
// billPreview used, so the Arabic locale gets them for free via t(). The device
// is a live component, not a static asset, so it re-flows under RTL naturally
// (DIRECTION §8.6).

import { R, SHADOW, MONO, NOIR, GLOW } from "../../lib/theme";
import { useT } from "../../lib/i18n-client";

// Locale-independent currency amount. Kept as a constant so the Pay button can
// isolate it as an LTR run under Arabic (mirrors MarketingView's pattern).
const PAY_AMOUNT = "SAR 77.49";

export function BillPreview() {
  const tr = useT();

  const items: [string, string][] = [
    ["2× Truffle Burger", "SAR 36.00"],
    ["Caesar Salad", "SAR 12.50"],
    ["Tiramisu", "SAR 9.50"],
  ];

  return (
    <div
      className="qp-glow-ring"
      style={{
        position: "relative",
        width: 300,
        background: NOIR.surface,
        borderRadius: R.xl,
        padding: 10,
        boxShadow: SHADOW.e3,
        border: `1px solid ${NOIR.borderStrong}`,
      }}
    >
      <div
        style={{
          background: NOIR.canvas,
          borderRadius: R.lg,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 20px 16px",
            background: NOIR.surfaceAlt,
          }}
        >
          <div style={{ fontSize: 12, color: NOIR.muted, fontWeight: 600 }}>
            {tr("The Copper Kitchen")}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 3, color: NOIR.text }}>
            {tr("Table 12 · 4 guests")}
          </div>
        </div>
        <div style={{ padding: "18px 20px 20px" }}>
          {items.map(([name, price]) => (
            <div
              key={name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 10,
                fontSize: 13,
                color: NOIR.muted,
                padding: "6px 0",
              }}
            >
              <span>{tr(name)}</span>
              <span style={{ fontWeight: 600, color: NOIR.text, ...MONO }}>{price}</span>
            </div>
          ))}
          <div style={{ borderTop: `1px dashed ${NOIR.borderStrong}`, margin: "12px 0" }} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              fontSize: 15,
              fontWeight: 700,
              color: NOIR.text,
            }}
          >
            <span>{tr("Total")}</span>
            <span style={{ color: GLOW.brand, fontSize: 17, ...MONO }}>SAR 77.49</span>
          </div>
          <button
            type="button"
            className="qp-press"
            style={{
              width: "100%",
              marginTop: 16,
              padding: 13,
              background: GLOW.brand,
              color: "#05141A",
              border: "none",
              borderRadius: R.md,
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {/* Keep the verb in the page's writing direction but isolate the
                locale-independent amount as its own LTR run, so AR renders
                "ادفع $77.49" (symbol-first) instead of reordering to "77.49$". */}
            <span style={{ ...MONO, direction: "inherit", unicodeBidi: "normal" }}>
              {tr("Pay $77.49").split("$77.49")[0].trim()}
            </span>{" "}
            <span style={MONO}>{PAY_AMOUNT}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
