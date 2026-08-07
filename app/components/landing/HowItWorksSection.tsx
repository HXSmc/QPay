"use client";

// Section 5 - how-it-works as a receipt timeline: three steps rendered as LINE
// ITEMS on one sheet() panel, dotted receipt rules between them, a pale ghost
// step numeral (01/02/03) leading each row. NOT three cards. The copy reuses
// already-vetted, already-translated solution strings from ar-marketing.

import { C, MONO, S, sheet } from "../../lib/theme";
import { useT } from "../../lib/i18n-client";
import { Section } from "./Section";

const STEPS: [string, string][] = [
  [
    "Pay at the table",
    "Guests scan, see the live bill, and pay in seconds. The table clears itself, so you never lose a turn waiting on a server to run the check.",
  ],
  [
    "Split any bill",
    "Even, by item, or custom. Each guest pays their share from their own phone, so there is no table math and no counting errors at the till.",
  ],
  [
    "Digital receipts",
    "Itemized receipts land instantly by email or SMS. Paperless, audit-ready, and no reprints at the counter.",
  ],
];

const NUMERALS = ["01", "02", "03"];

// Pale oversized step marker - the MNTN ghost-numeral idea scaled down to a
// ledger line item. Figures are Latin/mono (MONO isolates them LTR), aria-hidden.
function StepNumeral({ value }: { value: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        ...MONO,
        fontSize: 28,
        fontWeight: 700,
        lineHeight: 1,
        color: "rgba(23,21,15,0.12)",
        flexShrink: 0,
        minWidth: 36,
      }}
    >
      {value}
    </span>
  );
}

export function HowItWorksSection() {
  const tr = useT();

  return (
    <Section id="how-it-works" numeral="05" title={tr("Three steps. One sheet.")}>
      <div style={{ ...sheet({ pad: 0 }), maxWidth: 680 }}>
        {STEPS.map(([title, body], i) => (
          <div
            key={title}
            className={i > 0 ? "qp-hairline-dotted" : undefined}
            style={{ display: "flex", gap: S[4], padding: S[5], alignItems: "flex-start" }}
          >
            <StepNumeral value={NUMERALS[i]} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{tr(title)}</div>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, margin: `${S[2]}px 0 0` }}>
                {tr(body)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
