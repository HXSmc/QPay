"use client";

// Section 2 - commission-leak diagram (Convertify-style drawn evidence, pure
// divs, no chart lib). Two evidence panels use card() (interactive/evidence
// chrome, not receipt materiality) with rose/mint verdict tokens per the
// binding spec.
//
// FIX (2026-08-07, design-reviewer round 1): the two panels previously used
// inconsistent, magnitude-implying bar encodings (a 12%-wide "leak" notch for
// a printed "3%" figure - a 4x visual overstatement - next to a solid 100%
// fill on the other panel). Replaced with ONE identical encoding for both
// panels: a plain track, and a SAME fixed-width indicator (never scaled to
// the percentage) that is either present (something is taken) or absent
// (nothing is taken). The bar never claims a magnitude; the printed mono
// percent figure is the only number-bearing element.

import { C, R, S, MONO, card } from "../../lib/theme";
import { useT } from "../../lib/i18n-client";
import { Section } from "./Section";

const INDICATOR_WIDTH = "18%"; // fixed regardless of the printed percent - never a to-scale claim

function StatPanel({
  label,
  percent,
  percentColor,
  hasCut,
  indicatorColor,
  trackColor,
  caption,
}: {
  label: string;
  percent: string;
  percentColor: string;
  hasCut: boolean;
  indicatorColor: string;
  trackColor: string;
  caption: string;
}) {
  return (
    <div style={{ ...card({ pad: S[5], radius: R.lg }), flex: "1 1 260px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: S[3] }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{label}</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: percentColor, ...MONO }}>{percent}</span>
      </div>
      <div style={{ height: 12, borderRadius: R.pill, background: trackColor, overflow: "hidden" }}>
        {hasCut && <div style={{ width: INDICATOR_WIDTH, height: "100%", background: indicatorColor }} />}
      </div>
      <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.55, margin: `${S[3]}px 0 0` }}>{caption}</p>
    </div>
  );
}

export function CommissionLeak() {
  const tr = useT();

  return (
    <Section
      id="commission-leak"
      numeral="02"
      eyebrow={tr("The math")}
      title={tr("Commission takes a cut of every bill. Nuqra takes none.")}
    >
      <div style={{ display: "flex", gap: S[5], flexWrap: "wrap" }}>
        <StatPanel
          label={tr("Commission model")}
          percent="3%"
          percentColor={C.roseInk}
          hasCut
          indicatorColor={C.roseInk}
          trackColor={C.surfaceAlt}
          caption={tr("Gone on a SAR 300 table, every time: SAR 9.")}
        />
        <StatPanel
          label="Nuqra"
          percent="0%"
          percentColor={C.mintInk}
          hasCut={false}
          indicatorColor={C.mintInk}
          trackColor={C.mintBg}
          caption={tr("Zero taken from any bill. One flat fee per branch, monthly.")}
        />
      </div>
      <p style={{ fontSize: 12.5, color: C.faint, marginTop: S[4] }}>
        {tr("Illustrative example. Your numbers will vary.")}
      </p>
    </Section>
  );
}
