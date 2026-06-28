"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SITE } from "../lib/site";
import { C, R, S, SHADOW, NUM, btn } from "../lib/theme";
import { DemoModal } from "./site/DemoModal";
import { SalesDropdown } from "./site/SalesDropdown";

const SOLUTIONS = [
  {
    title: "Pay at table",
    body: "Scan the code, see the live bill, and pay instantly. No app download, no account.",
    icon: (
      <svg
        width="23"
        height="23"
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
        width="23"
        height="23"
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
        width="23"
        height="23"
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
        width="23"
        height="23"
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
  const salesWrapRef = useRef<HTMLDivElement>(null);
  const scrollToSolutions = () =>
    document
      .getElementById("solutions")
      ?.scrollIntoView({ behavior: "smooth" });

  return (
    <div style={{ background: C.surface }}>
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
      {/* HERO */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(120% 120% at 85% 0%, #EEF2FF 0%, #FFFFFF 55%)",
        }}
      >
        <div
          className="qp-hero-grid qp-section"
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "88px 32px 72px",
            display: "grid",
            gridTemplateColumns: "1.05fr 0.95fr",
            gap: 56,
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: S[2],
                padding: "7px 14px",
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
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#16A34A",
                  boxShadow: "0 0 0 3px rgba(22,163,74,0.18)",
                }}
              />
              {SITE.heroBadge}
            </div>
            <h1
              className="qp-hero-title"
              style={{
                fontSize: 58,
                lineHeight: 1.04,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: C.text,
                margin: "22px 0 0",
                textWrap: "balance",
              }}
            >
              Turn tables faster with{" "}
              <span style={{ color: C.brand }}>QR payments</span>
            </h1>
            <p
              style={{
                fontSize: 19,
                lineHeight: 1.55,
                color: C.muted,
                margin: "22px 0 0",
                maxWidth: 480,
              }}
            >
              Diners scan, split, tip, and pay in under 30 seconds. No app, no
              waiting for the check. QPay handles the rest.
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
                onClick={() => setDemoOpen(true)}
                style={{
                  ...btn("primary", { size: "lg" }),
                  gap: 9,
                  padding: "15px 26px",
                  borderRadius: R.md,
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: S[2],
                marginTop: 30,
                color: C.muted,
                fontSize: 13.5,
                fontWeight: 600,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#16A34A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              {SITE.trustLine}
            </div>
          </div>

          {/* Phone mockup */}
          <div
            className="qp-hide-mobile"
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "auto",
                width: 300,
                height: 300,
                background:
                  "radial-gradient(circle,rgba(46,91,255,0.18),transparent 70%)",
                filter: "blur(20px)",
              }}
            />
            <div
              style={{
                position: "relative",
                width: 286,
                background: C.ink,
                borderRadius: 36,
                padding: 11,
                boxShadow: SHADOW.e3,
              }}
            >
              <div
                style={{
                  background: C.surface,
                  borderRadius: 27,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "18px 18px 14px",
                    background: "linear-gradient(135deg,#2E5BFF,#5B7BFF)",
                    color: "#fff",
                  }}
                >
                  <div
                    style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}
                  >
                    The Copper Kitchen
                  </div>
                  <div
                    style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}
                  >
                    Table 12 · 4 guests
                  </div>
                </div>
                <div style={{ padding: "16px 18px" }}>
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
                        fontSize: 13,
                        color: C.muted,
                        padding: "5px 0",
                      }}
                    >
                      <span>{name}</span>
                      <span style={{ fontWeight: 700, color: C.text, ...NUM }}>
                        {price}
                      </span>
                    </div>
                  ))}
                  <div
                    style={{
                      borderTop: `1px dashed ${C.border}`,
                      margin: "10px 0",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 16,
                      fontWeight: 800,
                    }}
                  >
                    <span>Total</span>
                    <span style={{ color: C.brand, ...NUM }}>$77.49</span>
                  </div>
                  <button
                    className="qp-press"
                    style={{
                      width: "100%",
                      marginTop: 14,
                      padding: 13,
                      background: C.ink,
                      color: "#fff",
                      border: "none",
                      borderRadius: R.md,
                      fontFamily: "inherit",
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: "pointer",
                      ...NUM,
                    }}
                  >
                    Pay $77.49
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SOLUTIONS GRID */}
      <div
        id="solutions"
        className="qp-section"
        style={{ maxWidth: 1120, margin: "0 auto", padding: "64px 32px 24px", scrollMarginTop: 72 }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: 620,
            margin: "0 auto 48px",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: C.brand,
              textTransform: "uppercase",
            }}
          >
            Everything at the table
          </div>
          <h2
            style={{
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: C.text,
              margin: "12px 0 0",
            }}
          >
            One QR code. Every way to pay.
          </h2>
          <p
            style={{
              fontSize: 17,
              color: C.muted,
              margin: "16px 0 0",
              lineHeight: 1.55,
            }}
          >
            Built for the rush. QPay removes the slowest part of the meal, the
            wait for the check.
          </p>
        </div>
        {/* Asymmetric zig: wide+narrow on row 1, narrow+wide on row 2, so the
            row breaks out of 4-equal-card monotony while staying on a clean grid. */}
        <div
          className="qp-grid-4"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: S[4],
          }}
        >
          {SOLUTIONS.map((s, i) => {
            const featured = i === 0;
            const wide = i === 0 || i === 3;
            return (
              <div
                key={s.title}
                className="qp-solution"
                style={{
                  gridColumn: wide ? "span 2" : "span 1",
                  display: "flex",
                  flexDirection: wide ? "row" : "column",
                  alignItems: wide ? "center" : "flex-start",
                  gap: wide ? S[5] : 0,
                  padding: featured ? "32px 30px" : "28px 24px",
                  border: `1px solid ${featured ? "#C7D4FF" : C.border}`,
                  borderRadius: R.lg,
                  background: featured ? C.brandTint : C.surface,
                  boxShadow: SHADOW.e1,
                  transition: "all .15s",
                }}
              >
                <div
                  style={{
                    width: featured ? 56 : 46,
                    height: featured ? 56 : 46,
                    flexShrink: 0,
                    borderRadius: R.md,
                    background: featured ? C.brand : C.brandTint,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: featured ? "#fff" : C.brand,
                    boxShadow: featured ? SHADOW.cta : undefined,
                  }}
                >
                  {s.icon}
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: featured ? 20 : 18,
                      fontWeight: 700,
                      color: C.text,
                      margin: wide ? "0 0 6px" : "18px 0 8px",
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 14.5,
                      color: C.muted,
                      lineHeight: 1.55,
                      margin: 0,
                      maxWidth: wide ? 340 : undefined,
                    }}
                  >
                    {s.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ROI METRICS BAND */}
      <div style={{ maxWidth: 1120, margin: "64px auto", padding: "0 32px" }}>
        <div
          className="qp-section"
          style={{
            background: C.ink,
            borderRadius: R.xl,
            padding: "56px 48px",
            color: "#fff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -60,
              right: -40,
              width: 280,
              height: 280,
              background:
                "radial-gradient(circle,rgba(46,91,255,0.4),transparent 70%)",
              filter: "blur(10px)",
            }}
          />
          <div
            style={{
              position: "relative",
              textAlign: "center",
              marginBottom: 44,
            }}
          >
            <h2
              style={{
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                margin: 0,
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
              gap: 24,
            }}
          >
            {METRICS.map((m) => (
              <div key={m.label} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 52,
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                    color: "#7B97FF",
                    ...NUM,
                  }}
                >
                  {m.value}
                  <span style={{ fontSize: 26 }}>{m.unit}</span>
                </div>
                <div
                  style={{
                    fontSize: 14.5,
                    color: "#94A3B8",
                    marginTop: 10,
                    fontWeight: 600,
                  }}
                >
                  {m.label}
                </div>
              </div>
            ))}
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
            padding: "72px 32px",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: 42,
              fontWeight: 800,
              letterSpacing: "-0.025em",
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
              margin: "18px auto 32px",
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
              gap: S[4],
              justifyContent: "center",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              className="qp-cta"
              onClick={() => router.push("/admin/login")}
              style={{
                ...btn("primary", { size: "lg" }),
                padding: "16px 30px",
                borderRadius: R.md,
              }}
            >
              Start free trial
            </button>
            <div ref={salesWrapRef} style={{ position: "relative" }}>
              <button
                className="qp-press"
                onClick={() => setSalesOpen((v) => !v)}
                style={{
                  ...btn("secondary", { size: "lg" }),
                  padding: "16px 30px",
                  borderRadius: R.md,
                  borderColor: C.borderStrong,
                }}
              >
                Talk to sales
              </button>
              {salesOpen && (
                <SalesDropdown
                  onClose={() => setSalesOpen(false)}
                  anchorRef={salesWrapRef}
                />
              )}
            </div>
          </div>
        </div>
        <div
          style={{
            borderTop: "1px solid #DBE3F4",
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
