"use client";

// Section 5 - how-it-works as a receipt timeline (SCAFFOLD-adjacent: the
// three steps reuse already-vetted, already-translated solution copy from
// ar-marketing, rendered as line items on one sheet() panel with dotted
// hairlines between rows - the same receipt-timeline convention S2b should
// reuse for anything else that reads like ledger lines).

import { C, S, sheet } from "../../lib/theme";
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

export function HowItWorksSection() {
  const tr = useT();

  return (
    <Section id="how-it-works" numeral="05" title={tr("Three steps. One sheet.")}>
      <div style={{ ...sheet({ pad: 0 }), maxWidth: 680 }}>
        {STEPS.map(([title, body], i) => (
          <div key={title} className={i > 0 ? "qp-hairline-dotted" : undefined} style={{ padding: S[5] }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{tr(title)}</div>
            <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, margin: `${S[2]}px 0 0` }}>{tr(body)}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
