"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SITE } from "../lib/site";
import { C, R, S, SHADOW, T, MONO, btn, card } from "../lib/theme";
import { DemoForm } from "./site/DemoForm";
import { SalesDropdown } from "./site/SalesDropdown";

const EASE = "cubic-bezier(0.16,1,0.3,1)";

const SOLUTIONS = [
  {
    title: "Pay at table",
    body: "Scan the code, see the live bill, and pay instantly. No app download, no account.",
    icon: (
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect width="5" height="5" x="3" y="3" rx="1" />
        <rect width="5" height="5" x="16" y="3" rx="1" />
        <rect width="5" height="5" x="3" y="16" rx="1" />
        <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
        <path d="M21 21v.01" />
        <path d="M12 7v3a2 2 0 0 1-2 2H7" />
        <path d="M3 12h.01" />
        <path d="M12 3h.01" />
        <path d="M12 16v.01" />
        <path d="M16 12h1" />
        <path d="M21 12v.01" />
      </svg>
    ),
  },
  {
    title: "Split any bill",
    body: "Split evenly, by item, or by custom amount. Everyone pays their share from their own phone.",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: "Digital receipts",
    body: "Itemized receipts land instantly by email or SMS. Paperless and audit-ready.",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <path d="M12 17.5v-11" />
      </svg>
    ),
  },
  {
    title: "Live analytics",
    body: "Track revenue, tips, and table turnover in real time from one manager dashboard.",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
];

const METRICS = SITE.metrics;

export function MarketingView() {
  const router = useRouter();
  const [demoOpen, setDemoOpen] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);
  const [reduced, setReduced] = useState(false);

  // Honor prefers-reduced-motion: scrolls jump instantly and inline panels
  // appear without animating.
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(m.matches);
    apply();
    m.addEventListener?.("change", apply);
    return () => m.removeEventListener?.("change", apply);
  }, []);

  const scrollToId = (id: string) =>
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });

  const scrollToSolutions = () => scrollToId("solutions");

  // Open the inline demo section and ease it into view (never a hard jump).
  const openDemo = () => {
    setDemoOpen(true);
    requestAnimationFrame(() => scrollToId("demo"));
  };

  // Shared smooth expand/collapse for inline disclosures (GPU-friendly,
  // collapses instantly under reduced-motion).
  const expand = (open: boolean, max: number): CSSProperties => ({
    overflow: "hidden",
    maxHeight: open ? max : 0,
    opacity: open ? 1 : 0,
    transform: open ? "none" : "translateY(-6px)",
    transition: reduced
      ? "none"
      : `max-height 320ms ${EASE}, opacity 240ms ${EASE}, transform 280ms ${EASE}`,
  });

  const eyebrow: CSSProperties = {
    fontSize: 12.5,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: C.brand,
  };

  // The live bill preview block, reused as a real (not faux) device render.
  const billPreview = (
    <div
      style={{
        position: "relative",
        width: 290,
        background: C.ink,
        borderRadius: 38,
        padding: 11,
        boxShadow: SHADOW.e3,
      }}
    >
      <div
        style={{
          background: C.surface,
          borderRadius: 28,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 20px 16px",
            background: `linear-gradient(135deg, ${C.brandLight}, ${C.brandDark})`,
            color: C.surface,
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>
            The Copper Kitchen
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 3 }}>
            Table 12 · 4 guests
          </div>
        </div>
        <div style={{ padding: "18px 20px 20px" }}>
          {[
            ["2× Truffle Burger", "$36.00"],
            ["Caesar Salad", "$12.50"],
            ["Tiramisu", "$9.50"],
          ].map(([name, price]) => (
            <div
              key={name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 10,
                fontSize: 13,
                color: C.muted,
                padding: "6px 0",
              }}
            >
              <span>{name}</span>
              <span style={{ fontWeight: 600, color: C.text, ...MONO }}>
                {price}
              </span>
            </div>
          ))}
          <div
            style={{
              borderTop: `1px dashed ${C.borderStrong}`,
              margin: "12px 0",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              fontSize: 15,
              fontWeight: 700,
              color: C.text,
            }}
          >
            <span>Total</span>
            <span style={{ color: C.brand, fontSize: 17, ...MONO }}>$77.49</span>
          </div>
          <button
            className="qp-press"
            style={{
              width: "100%",
              marginTop: 16,
              padding: 13,
              background: C.brand,
              color: C.surface,
              border: "none",
              borderRadius: R.md,
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: SHADOW.cta,
            }}
          >
            <span style={MONO}>Pay $77.49</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ background: C.canvas, color: C.text }}>
      {/* HERO - asymmetric split: copy left, real live-bill device right. */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          background: `radial-gradient(115% 120% at 92% -12%, ${C.brandTint} 0%, ${C.canvas} 56%)`,
        }}
      >
        <div
          className="qp-hero-grid qp-section"
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "88px 32px 72px",
            display: "grid",
            gridTemplateColumns: "1.06fr 0.94fr",
            gap: 64,
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: S[2],
                padding: "7px 14px 7px 10px",
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: R.pill,
                fontSize: 13,
                fontWeight: 600,
                color: C.muted,
                boxShadow: SHADOW.e1,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 20,
                  height: 20,
                  borderRadius: R.pill,
                  background: C.brandTint,
                  color: C.brand,
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-4-4" />
                </svg>
              </span>
              {SITE.heroBadge}
            </div>
            <h1
              className="qp-hero-title"
              style={{
                fontSize: 58,
                lineHeight: 1.03,
                fontWeight: 700,
                letterSpacing: "-0.035em",
                color: C.text,
                margin: "24px 0 0",
                textWrap: "balance",
                maxWidth: 560,
              }}
            >
              Turn tables faster with{" "}
              <span style={{ color: C.brand }}>QR payments</span>
            </h1>
            <p
              style={{
                fontSize: 18.5,
                lineHeight: 1.55,
                color: C.muted,
                margin: "22px 0 0",
                maxWidth: 460,
              }}
            >
              Diners scan, split, tip, and pay in under 30 seconds. No app, no
              waiting for the check.
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: S[5],
                marginTop: 34,
                flexWrap: "wrap",
              }}
            >
              <button
                className="qp-cta"
                onClick={openDemo}
                style={{
                  ...btn("primary", { size: "lg" }),
                  gap: 9,
                  padding: "15px 26px",
                }}
              >
                Get a free demo
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
              {/* Secondary action is a quiet text link, not a second filled CTA. */}
              <button
                className="qp-press"
                onClick={scrollToSolutions}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "8px 4px",
                  background: "transparent",
                  color: C.text,
                  border: "none",
                  fontFamily: "inherit",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer",
                  textDecoration: "underline",
                  textUnderlineOffset: 5,
                  textDecorationColor: C.borderStrong,
                }}
              >
                See how it works
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 5v14" />
                  <path d="m19 12-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Framed device - renders the REAL live bill preview, not a faux UI. */}
          <div
            className="qp-hide-mobile"
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                width: 320,
                height: 320,
                borderRadius: "50%",
                background: C.brand,
                opacity: 0.1,
                filter: "blur(60px)",
              }}
            />
            {billPreview}
          </div>
        </div>
      </div>

      {/* TRUST strip - compliance line directly under the hero (no fake logos). */}
      <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "20px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: S[4],
          }}
        >
          <span
            aria-hidden="true"
            style={{ display: "inline-flex", color: C.brand }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </span>
          {SITE.trustLine.split(" · ").map((item, i, arr) => (
            <span
              key={item}
              style={{ display: "inline-flex", alignItems: "center", gap: S[4] }}
            >
              <span
                style={{
                  ...T.label,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: C.muted,
                }}
              >
                {item}
              </span>
              {i < arr.length - 1 && (
                <span aria-hidden="true" style={{ color: C.faint }}>
                  ·
                </span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* SOLUTIONS - featured statement + a varied bento (deliberate rhythm). */}
      <div
        id="solutions"
        className="qp-section"
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "84px 32px 32px",
          scrollMarginTop: 72,
        }}
      >
        <div style={{ maxWidth: 620, marginBottom: 40 }}>
          <div style={eyebrow}>Everything at the table</div>
          <h2
            style={{
              fontSize: 42,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.08,
              color: C.text,
              margin: "14px 0 0",
              textWrap: "balance",
            }}
          >
            One QR code. Every way to pay.
          </h2>
          <p
            style={{
              fontSize: 17.5,
              color: C.muted,
              margin: "16px 0 0",
              lineHeight: 1.55,
            }}
          >
            Built for the rush. Nuqra removes the slowest part of the meal, the
            wait for the check.
          </p>
        </div>

        {/* Featured: the hero capability, given its own full-width band. */}
        <div
          className="qp-solution"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: S[6],
            flexWrap: "wrap",
            padding: "36px 36px",
            border: `1px solid ${C.border}`,
            borderRadius: R.xl,
            background: C.brandTint,
            boxShadow: SHADOW.e1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: S[5],
              maxWidth: 560,
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                flexShrink: 0,
                borderRadius: R.lg,
                background: C.brand,
                color: C.surface,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: SHADOW.cta,
              }}
            >
              {SOLUTIONS[0].icon}
            </div>
            <div>
              <h3
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: C.text,
                  margin: "2px 0 8px",
                }}
              >
                {SOLUTIONS[0].title}
              </h3>
              <p
                style={{
                  fontSize: 16,
                  color: C.muted,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {SOLUTIONS[0].body}
              </p>
            </div>
          </div>

          {/* Decorative settled-bill chip - reinforces the ledger figures. */}
          <div
            aria-hidden="true"
            className="qp-hide-mobile"
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: S[4],
              padding: "16px 20px",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: R.lg,
              boxShadow: SHADOW.e2,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.faint,
                  letterSpacing: "0.02em",
                }}
              >
                Table 12
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: C.text,
                  marginTop: 2,
                  ...MONO,
                }}
              >
                $77.49
              </div>
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: C.brandDark,
                background: C.brandTint,
                border: `1px solid ${C.brand}`,
                borderRadius: R.pill,
                padding: "5px 11px",
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-4-4" />
              </svg>
              Paid
            </span>
          </div>
        </div>

        {/* Bento: a real photo cell + an ink cell break the card monotony. */}
        <div
          className="qp-grid-2"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,1fr)",
            gap: S[4],
            marginTop: S[4],
          }}
        >
          {/* Visual cell 1: on-brand ink panel (echoes the logo's ripple mark). */}
          <div
            style={{
              position: "relative",
              minHeight: 230,
              borderRadius: R.lg,
              overflow: "hidden",
              border: `1px solid ${C.ink}`,
              background: `linear-gradient(160deg, ${C.inkSoft}, ${C.ink})`,
              boxShadow: SHADOW.e1,
            }}
          >
            {/* concentric ripple, the tap-to-pay motif from the logomark */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: -90,
                right: -90,
                width: 280,
                height: 280,
                borderRadius: "50%",
                border: `1px solid ${C.brand}`,
                opacity: 0.35,
                boxShadow: `0 0 0 28px rgba(194,65,12,0.10), inset 0 0 60px rgba(194,65,12,0.12)`,
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 28,
                right: 28,
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: C.brand,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 22,
                right: 22,
                bottom: 20,
                color: "#fff",
              }}
            >
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                }}
              >
                Faster turns, fuller tables
              </div>
              <div
                style={{
                  fontSize: 14,
                  marginTop: 6,
                  color: "rgba(255,255,255,0.78)",
                  lineHeight: 1.5,
                }}
              >
                Guests pay the moment they are ready, so the next party is seated
                sooner.
              </div>
            </div>
          </div>

          {/* Solution card: Split any bill. */}
          <div
            className="qp-solution"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              padding: "28px 26px",
              border: `1px solid ${C.border}`,
              borderRadius: R.lg,
              background: C.surface,
              boxShadow: SHADOW.e1,
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                flexShrink: 0,
                borderRadius: R.md,
                background: C.brandTint,
                color: C.brand,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {SOLUTIONS[1].icon}
            </div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: C.text,
                margin: "18px 0 8px",
              }}
            >
              {SOLUTIONS[1].title}
            </h3>
            <p
              style={{
                fontSize: 14.5,
                color: C.muted,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {SOLUTIONS[1].body}
            </p>
          </div>

          {/* Solution card: Digital receipts. */}
          <div
            className="qp-solution"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              padding: "28px 26px",
              border: `1px solid ${C.border}`,
              borderRadius: R.lg,
              background: C.surface,
              boxShadow: SHADOW.e1,
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                flexShrink: 0,
                borderRadius: R.md,
                background: C.brandTint,
                color: C.brand,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {SOLUTIONS[2].icon}
            </div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: C.text,
                margin: "18px 0 8px",
              }}
            >
              {SOLUTIONS[2].title}
            </h3>
            <p
              style={{
                fontSize: 14.5,
                color: C.muted,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {SOLUTIONS[2].body}
            </p>
          </div>

          {/* Visual cell 2: Live analytics on an ink panel for contrast. */}
          <div
            className="qp-solution"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              padding: "28px 26px",
              border: `1px solid ${C.ink}`,
              borderRadius: R.lg,
              background: C.ink,
              boxShadow: SHADOW.e2,
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                flexShrink: 0,
                borderRadius: R.md,
                background: C.inkSoft,
                color: C.brandLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {SOLUTIONS[3].icon}
            </div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "#fff",
                margin: "18px 0 8px",
              }}
            >
              {SOLUTIONS[3].title}
            </h3>
            <p
              style={{
                fontSize: 14.5,
                color: "rgba(255,255,255,0.7)",
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {SOLUTIONS[3].body}
            </p>
          </div>
        </div>
      </div>

      {/* METRICS band - dark ink section, money figures in MONO. */}
      <div style={{ maxWidth: 1120, margin: "80px auto", padding: "0 32px" }}>
        <div
          className="qp-section"
          style={{
            background: C.ink,
            borderRadius: R.xl,
            padding: "60px 48px",
            color: C.surface,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -80,
              right: -60,
              width: 320,
              height: 320,
              borderRadius: "50%",
              background: C.brand,
              opacity: 0.16,
              filter: "blur(80px)",
            }}
          />
          <div
            style={{
              position: "relative",
              marginBottom: 44,
              maxWidth: 520,
            }}
          >
            <div
              style={{
                ...eyebrow,
                color: C.brandLight,
              }}
            >
              The numbers
            </div>
            <h2
              style={{
                fontSize: 34,
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                margin: "12px 0 0",
              }}
            >
              The math works in your favor
            </h2>
          </div>
          <div
            className="qp-grid-4"
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 28,
            }}
          >
            {METRICS.map((m) => (
              <div key={m.label}>
                <div
                  style={{
                    fontSize: 50,
                    fontWeight: 700,
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                    color: C.brandLight,
                    ...MONO,
                  }}
                >
                  {m.value}
                  <span style={{ fontSize: 24, marginLeft: 1 }}>{m.unit}</span>
                </div>
                <div
                  style={{
                    fontSize: 14.5,
                    color: "rgba(255,255,255,0.66)",
                    marginTop: 12,
                    fontWeight: 500,
                  }}
                >
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DEMO REQUEST - inline expandable disclosure (no popup). */}
      <div
        id="demo"
        className="qp-section"
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "8px 32px 72px",
          scrollMarginTop: 80,
        }}
      >
        <div style={{ ...card({ pad: S[6], radius: R.xl, elevated: true }) }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: S[4],
            }}
          >
            <div style={{ maxWidth: 420 }}>
              <h2
                style={{
                  fontSize: 27,
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  color: C.text,
                  margin: 0,
                }}
              >
                Get a free demo
              </h2>
              <p
                style={{
                  fontSize: 16,
                  color: C.muted,
                  margin: "10px 0 0",
                  lineHeight: 1.55,
                }}
              >
                See Nuqra live at your restaurant in 20 minutes. We&apos;ll email
                your trial admin login on the spot.
              </p>
            </div>
            <button
              className="qp-cta"
              onClick={() => (demoOpen ? setDemoOpen(false) : openDemo())}
              aria-expanded={demoOpen}
              aria-controls="demo-panel"
              style={{ ...btn("primary", { size: "lg" }) }}
            >
              {demoOpen ? "Hide form" : "Get a free demo"}
            </button>
          </div>
          <div
            id="demo-panel"
            inert={!demoOpen}
            aria-hidden={!demoOpen}
            style={expand(demoOpen, 520)}
          >
            <div style={{ paddingTop: S[5] }}>
              <DemoForm open={demoOpen} />
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER CTA */}
      <div style={{ background: C.brandTint, borderTop: `1px solid ${C.border}` }}>
        <div
          className="qp-section"
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "80px 32px",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: "-0.035em",
              lineHeight: 1.06,
              color: C.text,
              margin: 0,
              textWrap: "balance",
            }}
          >
            Ready to stop chasing checks?
          </h2>
          <p
            style={{
              fontSize: 18,
              color: C.muted,
              margin: "18px auto 34px",
              maxWidth: 520,
              lineHeight: 1.55,
            }}
          >
            Join thousands of restaurants getting paid faster. Setup takes one
            afternoon.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: S[4],
            }}
          >
            <div
              style={{
                display: "flex",
                gap: S[4],
                justifyContent: "center",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                className="qp-cta"
                onClick={() => router.push("/admin/login")}
                style={{ ...btn("primary", { size: "lg" }) }}
              >
                Start free trial
              </button>
              <button
                className="qp-press"
                onClick={() => setSalesOpen((v) => !v)}
                aria-expanded={salesOpen}
                aria-controls="sales-panel"
                style={{ ...btn("secondary", { size: "lg" }) }}
              >
                Talk to sales
              </button>
            </div>
            <div
              id="sales-panel"
              inert={!salesOpen}
              aria-hidden={!salesOpen}
              style={{ ...expand(salesOpen, 320), width: "100%", maxWidth: 340 }}
            >
              <div style={{ paddingTop: S[1] }}>
                <SalesDropdown />
              </div>
            </div>
          </div>
        </div>
        <div
          style={{
            borderTop: `1px solid ${C.border}`,
            padding: "28px 32px",
            textAlign: "center",
            color: C.muted,
            fontSize: 13.5,
          }}
        >
          © {SITE.copyrightYear} {SITE.company} ·{" "}
          <Link href="/privacy" style={{ color: C.muted, textDecoration: "underline" }}>
            Privacy
          </Link>{" "}
          ·{" "}
          <Link href="/terms" style={{ color: C.muted, textDecoration: "underline" }}>
            Terms
          </Link>{" "}
          · {SITE.footerClaim}
        </div>
      </div>
    </div>
  );
}
