"use client";

// Section 4 - SCAFFOLD ONLY. Real verdict rows (rose commission-model column
// vs mint Nuqra column, one-line comparisons, dotted hairline separators)
// come from S2b; this shell establishes the two-column card() frame with one
// honest, already-vetted row per side so the section reads intentional, not
// empty, before S2b expands it.

import { C, R, S, card } from "../../lib/theme";
import { useT } from "../../lib/i18n-client";
import { Section } from "./Section";

export function VerdictSection() {
  const tr = useT();

  return (
    <Section id="verdict" numeral="04" title={tr("The old way, next to the new one.")}>
      <div style={{ display: "flex", gap: S[5], flexWrap: "wrap" }}>
        <div style={{ ...card({ pad: S[5], radius: R.lg }), flex: "1 1 260px", borderColor: C.roseBg }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.roseInk, marginBottom: S[3] }}>
            {tr("Commission model")}
          </div>
          <div style={{ fontSize: 14.5, color: C.text }}>{tr("Percentage taken from every bill")}</div>
        </div>
        <div style={{ ...card({ pad: S[5], radius: R.lg }), flex: "1 1 260px", borderColor: C.mintBg }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.mintInk, marginBottom: S[3] }}>Nuqra</div>
          <div style={{ fontSize: 14.5, color: C.text }}>{tr("One flat fee. Every table, every month.")}</div>
        </div>
      </div>
    </Section>
  );
}
