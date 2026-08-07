"use client";

// Section 4 - commission model (rose, cross) vs Nuqra (mint, check), side by
// side. Comparison chrome, so card() (not a receipt sheet). One column per side,
// one-line rows separated by dotted receipt rules, and a glyph + words on every
// row so the verdict is never carried by colour alone. Every claim is concrete
// and true of the percentage-commission category vs Nuqra's flat model: no fake
// competitor names, no unverifiable stats. The two columns are row-for-row
// parallel (3 vs 3) so the comparison reads cleanly.

import { C, S, MONO, card } from "../../lib/theme";
import { useT, useLocale } from "../../lib/i18n-client";
import { Section } from "./Section";

const COMMISSION_ROWS = [
  "A percentage of every bill",
  "Diners must download an app",
  "Your cost rises with sales",
];

const NUQRA_ROWS = [
  "0% of every bill",
  "Pay in the browser, no app",
  "One flat fee, whatever you sell",
];

function CrossGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      aria-hidden="true"
      style={{ color: C.roseInk, flexShrink: 0, marginTop: 3 }}
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ color: C.mintInk, flexShrink: 0, marginTop: 3 }}
    >
      <path d="M20 6 9 17l-4-4" />
    </svg>
  );
}

export function VerdictSection() {
  const tr = useT();
  const locale = useLocale();

  return (
    <Section id="verdict" numeral="04" title={tr("The old way, next to the new one.")}>
      <div style={{ display: "flex", gap: S[5], flexWrap: "wrap", alignItems: "stretch" }}>
        {/* Commission model - rose */}
        <div style={{ ...card({ pad: 0, radius: 14 }), flex: "1 1 280px", borderColor: C.roseBg }}>
          <div style={{ padding: S[5], paddingBottom: S[4] }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.roseInk }}>
              {tr("Commission model")}
            </div>
          </div>
          {COMMISSION_ROWS.map((row, i) => (
            <div
              key={row}
              className={i > 0 ? "qp-hairline-dotted" : undefined}
              style={{ display: "flex", gap: S[3], padding: `${S[3]}px ${S[5]}px`, alignItems: "flex-start" }}
            >
              <CrossGlyph />
              <span style={{ fontSize: 14.5, color: C.text, lineHeight: 1.5 }}>{tr(row)}</span>
            </div>
          ))}
        </div>

        {/* Nuqra - mint */}
        <div style={{ ...card({ pad: 0, radius: 14 }), flex: "1 1 280px", borderColor: C.mintBg }}>
          <div style={{ padding: S[5], paddingBottom: S[4] }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.mintInk }}>{tr("Nuqra")}</div>
            <div style={{ fontSize: 12.5, color: C.mintInk, marginTop: 4 }}>
              {tr("mada and Apple Pay ready")}
            </div>
          </div>
          {NUQRA_ROWS.map((row, i) => (
            <div
              key={row}
              className={i > 0 ? "qp-hairline-dotted" : undefined}
              style={{ display: "flex", gap: S[3], padding: `${S[3]}px ${S[5]}px`, alignItems: "flex-start" }}
            >
              <CheckGlyph />
              <span style={{ fontSize: 14.5, color: C.text, lineHeight: 1.5 }}>
                {row === "0% of every bill" && locale === "en" ? (
                  <>
                    <span style={MONO}>0%</span> of every bill
                  </>
                ) : (
                  tr(row)
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
