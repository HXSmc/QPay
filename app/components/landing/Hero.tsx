"use client";

// Section 1 - hero. Asymmetric split (Section 4.3 anti-center-bias): concrete
// AR-first H1, one filled pill CTA + one outlined, and the receipt artifact
// as the page anchor. Reuses the qp-hero-grid / qp-hero-title / qp-section
// classes globals.css already defines (mobile collapse to a single column +
// smaller H1 - no new CSS needed). Grid tracks are direction-aware: "1.05fr
// 0.95fr" already mirrors correctly under RTL because grid-template-columns
// lays out from the inline-start edge, which flips with dir="rtl".
//
// FIX (2026-08-07, design-reviewer round 1): the receipt measured ~31-32% of
// hero AREA against the binding >=40% floor. Root cause: T.editorial's 72px
// ceiling made the (correctly concrete, but 7-word) headline wrap across 3+
// lines in the ~520px text column, so the taller text column - not the
// receipt - was setting the row's height, shrinking the receipt's share of
// the total area even though its width alone was already close to 40%. Fixed
// by shortening the headline to fit 2 lines and capping its font-size at 54px
// (still "editorial", but in taste-skill's own "most heroes" range for a
// headline that isn't 3-5 words) instead of T.editorial's 72px ceiling, and
// by enlarging the receipt itself (see ReceiptArtifact.tsx) so the row height
// is now set by the receipt, not the shrunk text column. Once the receipt
// alone set the row height, the section's own vertical padding became the
// next-biggest drag on the AREA ratio (padding counts toward the hero's
// measured box but isn't attributable to either column) - tightened that too,
// and narrowed the hero's own max-width slightly (bespoke to Hero.tsx only,
// other sections keep Section.tsx's 1120 default) so the receipt's width
// share of the hero grows without shrinking its absolute size further.

import Link from "next/link";
import { C, R, S, T, btn } from "../../lib/theme";
import { useT } from "../../lib/i18n-client";
import { ReceiptArtifact } from "./ReceiptArtifact";

export function Hero() {
  const tr = useT();

  return (
    <section
      id="hero"
      className="qp-hero-grid qp-section"
      style={{
        display: "grid",
        gridTemplateColumns: "1.05fr 0.95fr",
        gap: S[7],
        alignItems: "center",
        maxWidth: 1040,
        margin: "0 auto",
        padding: "32px 28px 40px",
      }}
    >
      <div>
        <h1
          className="qp-hero-title"
          style={{
            ...T.editorial,
            fontSize: "clamp(32px, 4.4vw, 54px)",
            margin: 0,
            color: C.text,
            maxWidth: 480,
          }}
        >
          {tr("Paid before they leave the table.")}
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.6, color: C.muted, margin: "20px 0 0", maxWidth: 480 }}>
          {tr("Diners scan, split, tip, and pay in under 30 seconds. No app, no waiting on the check.")}
        </p>
        <div style={{ display: "flex", gap: S[3], marginTop: S[6], flexWrap: "wrap" }}>
          <Link
            href="/demo"
            className="qp-cta"
            style={{ ...btn("primary", { size: "lg" }), borderRadius: R.pill, textDecoration: "none" }}
          >
            {tr("Start free trial")}
          </Link>
          <Link
            href="#how-it-works"
            className="qp-cta-lift"
            style={{ ...btn("secondary", { size: "lg" }), borderRadius: R.pill, textDecoration: "none" }}
          >
            {tr("See how it works")}
          </Link>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <ReceiptArtifact />
      </div>
    </section>
  );
}
