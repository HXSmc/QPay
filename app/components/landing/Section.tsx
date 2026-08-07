"use client";

// Shared landing patterns (S2b follows these):
//   1. <Section> - the section wrapper: id, optional ghost-numeral chapter
//      marker + eyebrow + title/subtitle header block, tone (paper /
//      surfaceAlt / the one ink band), scroll-reveal on the header.
//   2. <GhostNumeral> - the MNTN-style pale oversized chapter numeral.
// Surface language for content INSIDE a section (sheet() for receipt/ledger
// content, card() for evidence/comparison chrome) is each section's own
// choice - see CommissionLeak.tsx / HowItWorksSection.tsx for the two
// conventions in practice.
//
// Header row uses flexDirection "row" (numeral) or "column" (no numeral).
// Both are direction-aware by default under CSS Flexbox: "row" already flows
// start-to-end per the current writing mode, so RTL mirrors automatically,
// no manual reversal needed. flexWrap lets the numeral drop to its own line
// on narrow viewports without a bespoke media query.
//
// FIX (2026-08-07, design-reviewer round 1): headers used to render via the
// shared .qp-reveal-up class, whose CSS default is opacity:0 until JS toggles
// .qp-in via IntersectionObserver. In real full-page captures the observer
// doesn't reliably fire in time (fast scroll/resize, below-fold sections at
// capture time), stranding section headers permanently invisible. Fixed here
// by never touching opacity at all: content is opacity:1 always (readable
// with JS/observers never firing, by construction), and the scroll-reveal is
// now a transform-only "settle" (translateY) driven inline from useReveal's
// own return value, never through the shared opacity-gated CSS classes. This
// is local to Section.tsx only, so it does not change behavior for the other
// surfaces (customer/admin/branch) that still use qp-reveal-* directly.

import type { CSSProperties, ReactNode } from "react";
import { C, S, SX, TX, MONO } from "../../lib/theme";
import { Eyebrow } from "./Eyebrow";
import { useReveal } from "../../demo/immersive";
import { usePrefersReducedMotion } from "../../lib/use-reduced-motion";
import { INK } from "./ink";

type Tone = "paper" | "surfaceAlt" | "ink" | "sky";

const TONE_BG: Record<Tone, string> = {
  paper: C.canvas,
  surfaceAlt: C.surfaceAlt,
  ink: C.ink,
  sky: C.sky,
};
// sky is a LIGHT band (pale cyan), so it shares the dark-ink text/muted of the
// paper tones, not the light-on-dark INK palette.
const TONE_TEXT: Record<Tone, string> = { paper: C.text, surfaceAlt: C.text, ink: INK.text, sky: C.text };
const TONE_MUTED: Record<Tone, string> = { paper: C.muted, surfaceAlt: C.muted, ink: INK.muted, sky: C.muted };

export function GhostNumeral({ value, tone = "paper" }: { value: string; tone?: Tone }) {
  const color = tone === "ink" ? INK.faint : "rgba(23,21,15,0.07)";
  const style: CSSProperties = {
    ...MONO,
    display: "block",
    fontSize: "clamp(56px, 8vw, 112px)",
    fontWeight: 700,
    lineHeight: 1,
    color,
    userSelect: "none",
  };
  return (
    <span aria-hidden="true" style={style}>
      {value}
    </span>
  );
}

export function Section({
  id,
  numeral,
  eyebrow,
  title,
  subtitle,
  tone = "paper",
  maxWidth = 1120,
  align = "start",
  children,
}: {
  id: string;
  numeral?: string;
  eyebrow?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  tone?: Tone;
  maxWidth?: number;
  align?: "start" | "center";
  children?: ReactNode;
}) {
  const { ref, className: revealCls } = useReveal({ threshold: 0.15 });
  const reduced = usePrefersReducedMotion();
  const hasHeader = Boolean(numeral || eyebrow || title);
  // Settled once the observer confirms intersection (or immediately under
  // prefers-reduced-motion, per useReveal's own reduced-motion branch).
  // Opacity is never part of this state - see the FIX note above.
  const settled = revealCls.includes("qp-in");

  return (
    <section id={id} className="qp-section" style={{ background: TONE_BG[tone], padding: `${SX[9]}px 32px` }}>
      <div style={{ maxWidth, margin: "0 auto" }}>
        {hasHeader && (
          <div
            ref={ref}
            style={{
              display: "flex",
              flexDirection: numeral ? "row" : "column",
              flexWrap: "wrap",
              gap: numeral ? S[6] : 0,
              alignItems: numeral ? "flex-end" : align === "center" ? "center" : "flex-start",
              textAlign: align,
              marginBottom: S[7],
              opacity: 1,
              transform: reduced || settled ? "translateY(0)" : "translateY(10px)",
              transition: reduced ? "none" : "transform 560ms cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {numeral && <GhostNumeral value={numeral} tone={tone} />}
            <div style={{ maxWidth: 620, minWidth: 0 }}>
              {eyebrow && <Eyebrow tone={tone === "ink" ? "ink" : "paper"}>{eyebrow}</Eyebrow>}
              {title && <h2 style={{ ...TX.display, margin: 0, color: TONE_TEXT[tone] }}>{title}</h2>}
              {subtitle && (
                <p
                  style={{
                    fontSize: 16,
                    lineHeight: 1.6,
                    color: TONE_MUTED[tone],
                    margin: "14px 0 0",
                    maxWidth: 520,
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
