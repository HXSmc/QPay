"use client";

// Section 7 - honest proof, stated plainly: pilot status + the existing
// vetted trust line (no fake logos, testimonials, or stats). SCAFFOLD ONLY.
// S2b may expand this, but nothing here is a placeholder that needs removing;
// every word is already true.

import { useT } from "../../lib/i18n-client";
import { Section } from "./Section";
import { SITE } from "../../lib/site";

export function ProofSection() {
  const tr = useT();

  return (
    <Section
      id="proof"
      numeral="07"
      title={tr("Nuqra is in pilot with restaurants in Saudi Arabia.")}
      subtitle={tr(SITE.trustLine)}
    />
  );
}
