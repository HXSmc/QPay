"use client";

// Section 6 - ONE printed-sheet ledger panel (never 3-tier cards). States the
// flat fee plainly: no invented figure (the real monthly number is not in the
// codebase), so it says "flat monthly fee" in words rather than printing a
// made-up price. Inclusions follow as ledger lines with check glyphs. Mono is
// used nowhere here because nothing is numeric - the rule is "mono where
// numeric", and there are no figures to isolate.

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
      <div style={{ ...sheet({ pad: 0 }), maxWidth: 480 }}>
        {/* Fee statement - words, no invented number */}
        <div style={{ padding: S[5] }}>
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
      </div>
    </Section>
  );
}
