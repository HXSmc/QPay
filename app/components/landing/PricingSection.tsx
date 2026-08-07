"use client";

// Section 6 - SCAFFOLD ONLY. One printed-sheet ledger panel (never 3-tier
// cards) listing what's included, no invented price digit (the real figure
// is S2b's to place - this shell intentionally has no numeral placeholder
// standing in for it, since a blank ledger line would read as broken rather
// than "coming soon").

import { C, S, sheet } from "../../lib/theme";
import { useT } from "../../lib/i18n-client";
import { Section } from "./Section";

const INCLUDED = ["Unlimited tables at your branch", "Works with your existing POS", "Live analytics and digital receipts"];

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

  return (
    <Section id="pricing" numeral="06" title={tr("One flat fee. Not a percentage.")}>
      <div style={{ ...sheet({ pad: S[5] }), maxWidth: 480 }}>
        {INCLUDED.map((line, i) => (
          <div
            key={line}
            className={i > 0 ? "qp-hairline-dotted" : undefined}
            style={{ display: "flex", alignItems: "center", gap: S[3], padding: "10px 0" }}
          >
            <CheckIcon />
            <span style={{ fontSize: 14.5, color: C.text }}>{tr(line)}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}
