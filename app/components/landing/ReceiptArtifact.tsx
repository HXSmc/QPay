"use client";

// Hero anchor artifact: a real, rendered Nuqra bill on printed-sheet surface
// language (sheet(): white surface, hairline border, near-square radius, no
// hover lift - no torn edges, no perforation, no thermal texture). Ported
// from the retired immersive/BillPreview.tsx and restyled to the paper-ledger
// system: dotted hairline rules between line items (.qp-hairline-dotted, the
// same class the receipt-timeline in HowItWorksSection reuses), mono
// LTR-isolated figures, a real table number, and a QR block standing in for
// the diner's actual action (scan-to-pay) instead of a decorative, dead
// "Pay" button.
//
// Item totals are arithmetically real (36.00 + 12.50 + 9.50 = 58.00), the
// same math TableCycle.tsx's "Paid" face already uses - one consistent bill
// across the whole landing page.
//
// FIX (2026-08-07, design-reviewer round 1): sized up (width cap, padding,
// type scale, QR size) so the card's own height now sets the hero row's
// height instead of being vertically dwarfed by it - see Hero.tsx's FIX note
// for the full area-ratio reasoning. The three line items are unchanged (no
// new item added) so the printed total stays identical to TableCycle.tsx's.

import { QRCodeSVG } from "qrcode.react";
import { C, R, S, MONO, sheet } from "../../lib/theme";
import { useT } from "../../lib/i18n-client";
import { SITE } from "../../lib/site";

const ITEMS: [string, string][] = [
  ["2× Truffle Burger", "SAR 36.00"],
  ["Caesar Salad", "SAR 12.50"],
  ["Tiramisu", "SAR 9.50"],
];
const TOTAL = "SAR 58.00";
const QR_VALUE = `${SITE.appUrl}/demo`;

export function ReceiptArtifact() {
  const tr = useT();

  return (
    <div
      style={{
        ...sheet({ pad: 0 }),
        width: "clamp(340px, 40vw, 520px)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: `${S[6]}px ${S[6]}px ${S[5]}px` }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: C.muted }}>{tr("The Copper Kitchen")}</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 5, color: C.text }}>
          {tr("Table 12 · 4 guests")}
        </div>
      </div>

      <div style={{ padding: `0 ${S[6]}px` }}>
        {ITEMS.map(([name, price], i) => (
          <div
            key={name}
            className={i > 0 ? "qp-hairline-dotted" : undefined}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: S[3],
              fontSize: 15.5,
              color: C.muted,
              padding: "14px 0",
            }}
          >
            <span>{tr(name)}</span>
            <span style={{ fontWeight: 600, color: C.text, ...MONO }}>{price}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: `${S[5]}px ${S[6]}px`, borderTop: `1px dotted ${C.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 16.5, fontWeight: 700, color: C.text }}>{tr("Total")}</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: C.brand, ...MONO }}>{TOTAL}</span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: S[5],
          padding: S[6],
          borderTop: `1px solid ${C.border}`,
          background: C.surfaceAlt,
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: 8,
            borderRadius: R.xs,
            border: `1px solid ${C.border}`,
            flexShrink: 0,
            lineHeight: 0,
          }}
        >
          <QRCodeSVG value={QR_VALUE} size={88} level="M" fgColor={C.ink} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{tr("Table 12")}</div>
          <div style={{ fontSize: 13.5, color: C.muted, marginTop: 3 }}>{tr("Scan to pay")}</div>
        </div>
      </div>
    </div>
  );
}
