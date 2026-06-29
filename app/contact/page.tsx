import type { Metadata } from "next";
import Link from "next/link";
import { BrandHeader } from "../components/site/BrandHeader";
import { ContactForm } from "../components/site/ContactForm";
import { SalesDropdown } from "../components/site/SalesDropdown";
import { getServerLocale } from "../lib/i18n-server";
import { t } from "../lib/i18n";
import { C, R, S, T, card } from "../lib/theme";

export const metadata: Metadata = {
  title: "Talk to sales · Nuqra",
  description:
    "Tell us about your restaurant and POS. We'll set up a tailored Nuqra walkthrough, handle the integration, and plan your branch rollout.",
};

// Benefits are sales-specific (the demo page already sells self-serve). Each is
// benefit-first with a concrete, honest supporting line. No fabricated metrics.
const POINTS = [
  {
    title: "A walkthrough built around your floor",
    body: "We map Nuqra to how your tables, menu, and service actually run, instead of a generic demo.",
  },
  {
    title: "POS integration, done for you",
    body: "Already on Foodics, Marn, Anywhere, or another POS? We connect it so orders and payments stay in sync.",
  },
  {
    title: "Built for multi-branch",
    body: "Launch one location or fifty. Per-branch settings, currency, and reporting are there from day one.",
  },
];

export default async function ContactPage() {
  const locale = await getServerLocale();
  const tr = (s: string) => t(s, locale);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.canvas,
        color: C.text,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <BrandHeader />

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 32px 0" }}>
        <Link
          href="/"
          style={{
            ...T.label,
            color: C.muted,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          {tr("Back to home")}
        </Link>
      </div>

      <div
        className="qp-section qp-grid-2"
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "32px 32px 96px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 56,
          alignItems: "start",
        }}
      >
        {/* Left: value prop + the call-now alternative. */}
        <div>
          <div
            style={{
              ...T.label,
              color: C.brand,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            {tr("Talk to sales")}
          </div>
          <h1
            style={{
              fontSize: 42,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.06,
              margin: "14px 0 0",
              maxWidth: 460,
            }}
          >
            {tr("Roll Nuqra out across every branch")}
          </h1>
          <p
            style={{
              fontSize: 17,
              color: C.muted,
              lineHeight: 1.6,
              margin: "18px 0 0",
              maxWidth: 440,
            }}
          >
            {tr(
              "Tell us about your restaurant and your POS. We'll set up a tailored walkthrough and handle the integration for you."
            )}
          </p>

          <div style={{ marginTop: 40, display: "grid", gap: S[5] }}>
            {POINTS.map((p) => (
              <div key={p.title} style={{ display: "flex", gap: S[4] }}>
                <span
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    marginTop: 3,
                    width: 22,
                    height: 22,
                    borderRadius: R.pill,
                    background: C.brandTint,
                    color: C.brand,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
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
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <div>
                  <div style={{ ...T.h3, color: C.text }}>{tr(p.title)}</div>
                  <p
                    style={{
                      fontSize: 14.5,
                      color: C.muted,
                      lineHeight: 1.55,
                      margin: "4px 0 0",
                      maxWidth: 380,
                    }}
                  >
                    {tr(p.body)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Prefer a call? The existing sales card carries the number. */}
          <div style={{ marginTop: 36, maxWidth: 360 }}>
            <div
              style={{
                ...T.label,
                color: C.muted,
                marginBottom: S[3],
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              {tr("Prefer to call?")}
            </div>
            <SalesDropdown />
          </div>

          <p style={{ fontSize: 14, color: C.faint, marginTop: 28 }}>
            {tr("Just want to try it yourself?")}{" "}
            <Link
              href="/demo"
              style={{ color: C.brand, fontWeight: 600, textDecoration: "none" }}
            >
              {tr("Start a free trial")}
            </Link>
          </p>
        </div>

        {/* Right: the lead-capture form. */}
        <div style={{ ...card({ pad: S[6], radius: R.xl, elevated: true }) }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              margin: 0,
              color: C.text,
            }}
          >
            {tr("Request a callback")}
          </h2>
          <p
            style={{
              fontSize: 14.5,
              color: C.muted,
              lineHeight: 1.55,
              margin: "8px 0 0",
            }}
          >
            {tr("Share a few details and we'll reach out at a time that suits you.")}
          </p>
          <div style={{ marginTop: S[5] }}>
            <ContactForm />
          </div>
        </div>
      </div>

    </div>
  );
}
