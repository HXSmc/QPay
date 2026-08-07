"use client";

// The eyebrow device: a short rule + small tracked label above a section
// heading (MNTN ref). Budgeted to <=3 uses total across the landing page,
// see the per-section usage notes in this directory. Arabic has no letter
// case and wide tracking breaks cursive joining, so uppercase + letter-spacing
// apply to the Latin (EN) render only; Arabic renders the label at its
// natural weight with no tracking.

import { C, TX, S } from "../../lib/theme";
import { useLocale } from "../../lib/i18n-client";
import { INK } from "./ink";

export function Eyebrow({
  children,
  tone = "paper",
}: {
  children: string;
  tone?: "paper" | "ink";
}) {
  const locale = useLocale();
  const rtl = locale === "ar";
  const ruleColor = tone === "ink" ? INK.faint : C.borderStrong;
  const textColor = tone === "ink" ? C.brandLight : C.brand;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        marginBottom: S[3],
      }}
    >
      <span aria-hidden="true" style={{ width: 16, height: 1, background: ruleColor, flexShrink: 0 }} />
      <span
        style={{
          fontSize: TX.eyebrow.fontSize,
          fontWeight: TX.eyebrow.fontWeight,
          letterSpacing: rtl ? "0" : TX.eyebrow.letterSpacing,
          textTransform: rtl ? "none" : TX.eyebrow.textTransform,
          color: textColor,
        }}
      >
        {children}
      </span>
    </div>
  );
}
