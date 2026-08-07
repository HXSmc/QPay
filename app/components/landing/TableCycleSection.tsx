"use client";

// Section 3 - the TableCycle revolving ring (existing component, mechanics
// owned by S3's reskin task; this just imports and places it per the binding
// landing structure). tone="surfaceAlt" gives this section a quiet recessed
// background (value shift, no shadow) so the ring reads as its own beat in
// the zigzag flow without a hairline or card wrapper around it.

import { useT } from "../../lib/i18n-client";
import { Section } from "./Section";
import { TableCycle } from "../TableCycle";

export function TableCycleSection() {
  const tr = useT();

  return (
    <Section
      id="live-floor"
      numeral="03"
      eyebrow={tr("Live floor")}
      title={tr("Every table, live")}
      subtitle={tr("Watch a table go from available to ordered to paid, in real time.")}
      tone="surfaceAlt"
    >
      <TableCycle />
    </Section>
  );
}
