"use client";

// Section 6 - ONE printed-sheet ledger panel (never 3-tier cards). Reads as a
// real thermal-printer receipt: a mono merchant/meta header, the fee statement
// in words (no invented figure - the real monthly number is not in the
// codebase), included lines as check glyphs, then receipt-style zero-amount
// lines ("No setup fee - 0", "Commission on sales - 0%") and a TOTAL line that
// restates the terms in words. Zeros and figures use the mono ledger face
// (Latin digits, isolated LTR even inside Arabic). The sheet's bottom edge is
// clipped into a zigzag tear, as cut by a receipt printer.

import { C, S, sheet, MONO } from "../../lib/theme";
import { useT, useLocale } from "../../lib/i18n-client";
import { Section } from "./Section";

const INCLUDED = ["Unlimited tables at your branch", "Works with your existing POS", "Live analytics and digital receipts"];

// Torn bottom edge: a sawtooth clip-path. Peaks sit at the true bottom (100%),
// valleys are cut `TOOTH_H` up into the sheet, so the cut eats only padding
// (never text). X in % keeps it crisp at any width; calc() in y keeps the tooth
// height fixed in px. Computed once at module scope.
const TOOTH_H = 7;
function tornClip(teeth: number, h: number): string {
  const step = 100 / teeth;
  const pts = ["0% 0%", "100% 0%", "100% 100%"]; // top edge + bottom-right corner
  // Walk the bottom edge right-to-left: valley (cut up) then peak (full bottom).
  for (let i = 0; i < teeth; i++) {
    const valleyX = (teeth - i - 0.5) * step;
    const peakX = (teeth - i - 1) * step;
    pts.push(`${valleyX}% calc(100% - ${h}px)`);
    pts.push(`${peakX}% 100%`);
  }
  return `polygon(${pts.join(", ")})`;
}
const TORN_EDGE = tornClip(14, TOOTH_H);

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ color: C.mintInk, flexShrink: 0 }}
    >
      <path d="M20 6 9 17l-4-4" />
    </svg>
  );
}

export function PricingSection() {
  const tr = useT();
  const locale = useLocale();
  const rtl = locale === "ar";

  // New receipt strings as inline en/ar pairs (self-contained: the shared
  // Arabic dictionary is out of this file's ownership, so we don't lean on it
  // for the added lines). Figures stay Latin + isolated via MONO below.
  const noSetup = rtl ? "بلا رسوم إعداد" : "No setup fee";
  const commission = rtl ? "عمولة على المبيعات" : "Commission on sales";
  const totalLabel = rtl ? "الإجمالي" : "TOTAL";
  const totalValue = rtl ? "رسم ثابت واحد / فرع / شهر" : "One flat fee / branch / month";
  const meta = rtl ? "كشف فوترة · شهري" : "BILLING RECEIPT · MONTHLY";

  return (
    <Section id="pricing" numeral="06" title={tr("One flat fee. Not a percentage.")}>
      <div
        style={{
          ...sheet({ pad: 0 }),
          maxWidth: 480,
          // Round only the top corners; the bottom is torn by the clip. Extra
          // bottom padding guarantees the teeth cut empty paper, not content.
          borderRadius: `${5}px ${5}px 0 0`,
          clipPath: TORN_EDGE,
          paddingBottom: TOOTH_H,
        }}
      >
        {/* Merchant / meta header - mono, muted, like a receipt masthead. */}
        <div
          style={{
            ...MONO,
            padding: `${S[4]}px ${S[5]}px ${S[3]}px`,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: C.muted,
            textAlign: "center",
          }}
        >
          {meta}
        </div>
        {/* Fee statement - words, no invented number */}
        <div style={{ padding: `${S[4]}px ${S[5]}px ${S[5]}px` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.brand }}>
            {tr("Flat monthly fee per branch")}
          </div>
          <div style={{ fontSize: 17, fontWeight: 600, color: C.text, marginTop: S[3], lineHeight: 1.4 }}>
            {tr("One flat fee per branch, every month. It never grows with your sales.")}
          </div>
          <div style={{ fontSize: 13.5, color: C.muted, marginTop: S[2] }}>
            {tr("No percentage of your sales.")}
          </div>
        </div>
        {/* Included - ledger lines */}
        {INCLUDED.map((line, i) => (
          <div
            key={line}
            className={i > 0 ? "qp-hairline-dotted" : undefined}
            style={{ display: "flex", alignItems: "center", gap: S[3], padding: `${S[3]}px ${S[5]}` }}
          >
            <CheckIcon />
            <span style={{ fontSize: 14.5, color: C.text }}>{tr(line)}</span>
          </div>
        ))}
        {/* Not charged - receipt-style zero lines. Green zero = good news,
            isolated LTR so "0%" never reorders under RTL. */}
        {[
          [noSetup, "0"],
          [commission, "0%"],
        ].map(([label, amt]) => (
          <div
            key={label}
            className="qp-hairline-dotted"
            style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: S[4], padding: `${S[3]}px ${S[5]}` }}
          >
            <span style={{ fontSize: 14.5, color: C.text }}>{label}</span>
            <span style={{ ...MONO, fontSize: 14.5, fontWeight: 600, color: C.mintInk }}>{amt}</span>
          </div>
        ))}
        {/* TOTAL - the bottom line, terms restated in words (no invented figure). */}
        <div className="qp-hairline-dotted" style={{ padding: `${S[4]}px ${S[5]}px ${S[5]}px` }}>
          <div style={{ ...MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: C.brand }}>
            {totalLabel}
          </div>
          <div style={{ fontSize: 17, fontWeight: 600, color: C.text, marginTop: S[2], lineHeight: 1.3 }}>
            {totalValue}
          </div>
        </div>
      </div>
    </Section>
  );
}
