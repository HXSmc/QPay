"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SITE } from "../lib/site";
import { C, R, S, SHADOW, T, MONO, btn } from "../lib/theme";
import { useT } from "../lib/i18n-client";

const SOLUTIONS = [
  {
    title: "Pay at the table",
    body: "Guests scan, see the live bill, and pay in seconds. The table clears itself, so you never lose a turn waiting on a server to run the check.",
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
    body: "Even, by item, or custom. Each guest pays their share from their own phone, so there is no table math and no counting errors at the till.",
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
    body: "Itemized receipts land instantly by email or SMS. Paperless, audit-ready, and no reprints at the counter.",
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
    body: "Track revenue, tips, and table turnover in real time, so you can staff the next rush before it hits.",
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

// Objection-handling: the real questions an operator asks before switching.
// Honest, specific where we can be, non-committal where we should not overclaim.
const FAQ = [
  {
    q: "Do diners need an app?",
    a: "No. They scan a QR and pay in their browser. Nothing to download, and their phone never leaves their hand.",
  },
  {
    q: "New hardware to buy?",
    a: "None. Nuqra runs alongside your current POS workflow. If you can print a QR code, you are ready to take payments.",
  },
  {
    q: "How long is setup?",
    a: "About an afternoon. Most teams print their codes and take their first table-side payment the same day.",
  },
  {
    q: "Is it secure?",
    a: "Payments are encrypted, and diners never hand a card or phone to staff. Everyone pays from their own device.",
  },
];

export function MarketingView() {
  const tr = useT();
  const router = useRouter();
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
            background: `linear-gradient(150deg, ${C.ink}, ${C.inkSoft})`,
            color: C.surface,
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>
            {tr("The Copper Kitchen")}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 3 }}>
            {tr("Table 12 · 4 guests")}
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
              <span>{tr(name)}</span>
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
            <span>{tr("Total")}</span>
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
            <span style={MONO}>{tr("Pay $77.49")}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    // Transparent so the page-wrapper hero glow (which spans behind the navbar)
    // shows through; sections below set their own backgrounds as before.
    <div style={{ background: "transparent", color: C.text }}>
      {/* HERO - asymmetric split: copy left, real live-bill device right. The
          glow now lives on the page wrapper (app/page.tsx) so it continues
          seamlessly behind the sticky navbar. */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
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
              {tr("Turn tables faster.")}{" "}
              <span style={{ color: C.brand }}>{tr("Get paid before they leave.")}</span>
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
              {tr(
                "Diners scan, split, tip, and pay in under 30 seconds. No app, no waiting on the check."
              )}
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
                onClick={() => router.push("/demo")}
                style={{
                  ...btn("primary", { size: "lg" }),
                  gap: 9,
                  padding: "15px 26px",
                }}
              >
                {tr("Start free trial")}
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
                {tr("See how it works")}
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
            {/* Risk-reversal microline - genuine, matches the /demo free trial. */}
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: C.muted,
                margin: "18px 0 0",
              }}
            >
              {tr(SITE.heroBadge)}
            </p>
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
            {billPreview}
          </div>
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
          <div style={eyebrow}>{tr("Everything at the table")}</div>
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
            {tr("One QR code. Every way to pay.")}
          </h2>
          <p
            style={{
              fontSize: 17.5,
              color: C.muted,
              margin: "16px 0 0",
              lineHeight: 1.55,
            }}
          >
            {tr(
              "Built for the rush. Nuqra removes the slowest part of the meal, the wait for the check."
            )}
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
                {tr(SOLUTIONS[0].title)}
              </h3>
              <p
                style={{
                  fontSize: 16,
                  color: C.muted,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {tr(SOLUTIONS[0].body)}
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
                  color: C.muted,
                  letterSpacing: "0.02em",
                }}
              >
                {tr("Table 12")}
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
              {tr("Paid")}
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
                {tr("Faster turns, fuller tables")}
              </div>
              <div
                style={{
                  fontSize: 14,
                  marginTop: 6,
                  color: "rgba(255,255,255,0.78)",
                  lineHeight: 1.5,
                }}
              >
                {tr(
                  "Guests pay the moment they are ready, so the next party is seated sooner."
                )}
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
              {tr(SOLUTIONS[1].title)}
            </h3>
            <p
              style={{
                fontSize: 14.5,
                color: C.muted,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {tr(SOLUTIONS[1].body)}
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
              {tr(SOLUTIONS[2].title)}
            </h3>
            <p
              style={{
                fontSize: 14.5,
                color: C.muted,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {tr(SOLUTIONS[2].body)}
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
              {tr(SOLUTIONS[3].title)}
            </h3>
            <p
              style={{
                fontSize: 14.5,
                color: "rgba(255,255,255,0.7)",
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {tr(SOLUTIONS[3].body)}
            </p>
          </div>
        </div>
      </div>

      {/* METRICS band - editorial ledger: one hero figure + hairline rows. */}
      <div style={{ maxWidth: 1120, margin: "96px auto", padding: "0 32px" }}>
        <div
          className="qp-section qp-grid-2"
          style={{
            background: C.ink,
            borderRadius: R.xl,
            padding: "64px 56px",
            color: C.surface,
            position: "relative",
            overflow: "hidden",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 56,
            alignItems: "center",
          }}
        >
          {/* concentric ripple - the tap-to-pay motif from the logomark */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -130,
              left: -130,
              width: 380,
              height: 380,
              borderRadius: "50%",
              border: `1px solid ${C.brand}`,
              opacity: 0.22,
            }}
          />

          {/* Left: statement + the hero figure. */}
          <div style={{ position: "relative" }}>
            <h2
              style={{
                fontSize: 40,
                fontWeight: 600,
                letterSpacing: "-0.03em",
                lineHeight: 1.08,
                margin: 0,
                maxWidth: 420,
              }}
            >
              {tr("The math works in your favor")}
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "rgba(255,255,255,0.6)",
                margin: "16px 0 40px",
                maxWidth: 380,
                lineHeight: 1.55,
              }}
            >
              {tr(
                "What faster table-side checkout adds up to over a full service."
              )}
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span
                style={{
                  fontSize: 92,
                  fontWeight: 600,
                  letterSpacing: "-0.05em",
                  lineHeight: 0.9,
                  color: C.brandLight,
                  ...MONO,
                }}
              >
                {METRICS[0].value}
              </span>
              <span
                style={{
                  fontSize: 34,
                  fontWeight: 600,
                  color: C.brandLight,
                  ...MONO,
                }}
              >
                {METRICS[0].unit}
              </span>
            </div>
            <div
              style={{
                fontSize: 15,
                color: "rgba(255,255,255,0.7)",
                marginTop: 14,
                fontWeight: 500,
              }}
            >
              {tr(METRICS[0].label)}
            </div>
          </div>

          {/* Right: the remaining figures as a hairline ledger. */}
          <div style={{ position: "relative" }}>
            {METRICS.slice(1).map((m) => (
              <div
                key={m.label}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 20,
                  padding: "22px 0",
                  borderTop: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span
                    style={{
                      fontSize: 44,
                      fontWeight: 600,
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                      ...MONO,
                    }}
                  >
                    {m.value}
                  </span>
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.85)",
                      ...MONO,
                    }}
                  >
                    {m.unit}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 14.5,
                    color: "rgba(255,255,255,0.64)",
                    fontWeight: 500,
                    textAlign: "end",
                    maxWidth: 170,
                  }}
                >
                  {tr(m.label)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* OBJECTIONS - a hairline definition list (a layout not used above). */}
      <div
        className="qp-section"
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "0 32px 32px",
        }}
      >
        <div style={{ maxWidth: 620, marginBottom: 28 }}>
          <div style={eyebrow}>{tr("Before you switch")}</div>
          <h2
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              color: C.text,
              margin: "14px 0 0",
              textWrap: "balance",
            }}
          >
            {tr("Less to change than you think.")}
          </h2>
        </div>
        <dl style={{ margin: 0 }}>
          {FAQ.map((item) => (
            <div
              key={item.q}
              className="qp-grid-2"
              style={{
                display: "grid",
                gridTemplateColumns: "0.78fr 1.22fr",
                gap: S[6],
                padding: "26px 0",
                borderTop: `1px solid ${C.border}`,
              }}
            >
              <dt
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  color: C.text,
                  margin: 0,
                }}
              >
                {tr(item.q)}
              </dt>
              <dd
                style={{
                  margin: 0,
                  fontSize: 16,
                  color: C.muted,
                  lineHeight: 1.6,
                  maxWidth: 540,
                }}
              >
                {tr(item.a)}
              </dd>
            </div>
          ))}
        </dl>
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
            {tr("Ready to stop chasing checks?")}
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
            {tr(
              "Get paid before they leave the table. Setup takes one afternoon, and your first trial login lands in your inbox on the spot."
            )}
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
                onClick={() => router.push("/demo")}
                style={{ ...btn("primary", { size: "lg" }) }}
              >
                {tr("Start free trial")}
              </button>
              <button
                className="qp-press"
                onClick={() => router.push("/contact")}
                style={{ ...btn("secondary", { size: "lg" }) }}
              >
                {tr("Talk to sales")}
              </button>
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
            {tr("Privacy")}
          </Link>{" "}
          ·{" "}
          <Link href="/terms" style={{ color: C.muted, textDecoration: "underline" }}>
            {tr("Terms")}
          </Link>
        </div>
      </div>
    </div>
  );
}
