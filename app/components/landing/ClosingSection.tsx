"use client";

// Section 8 - the closing band. tone="sky" (pale cyan, the production
// nuqra.org light-blue) on a LIGHT background: dark ink text, brand accents.
// Content is already-vetted, already-translated copy (no scaffold needed
// here). No ghost numeral - this is a closing statement, not another chapter
// in the ledger narrative.

import Link from "next/link";
import { C, R, S, btn } from "../../lib/theme";
import { useT } from "../../lib/i18n-client";
import { Section } from "./Section";

export function ClosingSection() {
  const tr = useT();

  return (
    <Section
      id="start"
      title={tr("Ready to stop chasing checks?")}
      subtitle={tr(
        "Get paid before they leave the table. Setup takes one afternoon, and we email your trial login as soon as you sign up.",
      )}
      tone="sky"
      align="center"
    >
      <div style={{ display: "flex", gap: S[3], justifyContent: "center", flexWrap: "wrap" }}>
        <Link
          href="/demo"
          className="qp-cta"
          style={{ ...btn("primary", { size: "lg" }), borderRadius: R.pill, textDecoration: "none" }}
        >
          {tr("Start free trial")}
        </Link>
        <Link
          href="/contact"
          className="qp-cta-lift"
          style={{
            ...btn("secondary", { size: "lg" }),
            borderRadius: R.pill,
            textDecoration: "none",
            background: "transparent",
            color: C.text,
            borderColor: C.muted,
          }}
        >
          {tr("Talk to sales")}
        </Link>
      </div>
    </Section>
  );
}
