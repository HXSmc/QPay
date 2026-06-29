import type { Metadata } from "next";
import Link from "next/link";
import { BrandHeader } from "../components/site/BrandHeader";
import { DemoForm } from "../components/site/DemoForm";
import { getServerLocale } from "../lib/i18n-server";
import { t } from "../lib/i18n";
import { C, R, S, T, card } from "../lib/theme";

export const metadata: Metadata = {
  title: "Start your free trial · Nuqra",
  description:
    "Create a Nuqra trial account. We email your admin login on the spot so you can take a payment in minutes.",
};

const PERKS = [
  {
    title: "Live in minutes",
    body: "Get a working admin account by email, add a table, and take your first QR payment the same afternoon.",
  },
  {
    title: "No card, no commitment",
    body: "A 7-day trial with full access. Bring your own menu and tax rate, or start from a clean slate.",
  },
  {
    title: "Real diner flow",
    body: "Scan, split, tip, and pay end to end, exactly as your guests will use it on the floor.",
  },
];

export default async function DemoPage() {
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
        {/* Left: value prop. */}
        <div>
          <div
            style={{
              ...T.label,
              color: C.brand,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            {tr("Free trial")}
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
            {tr("Take your first QR payment today")}
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
              "Create your account below. We email your admin login right away, so you can set up a table and run a real bill in minutes."
            )}
          </p>

          <div style={{ marginTop: 40, display: "grid", gap: S[5] }}>
            {PERKS.map((p) => (
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

          <p style={{ fontSize: 14, color: C.muted, marginTop: 36 }}>
            {tr("Already have an account?")}{" "}
            <Link
              href="/admin/login"
              style={{ color: C.brand, fontWeight: 600, textDecoration: "none" }}
            >
              {tr("Sign in")}
            </Link>
          </p>
        </div>

        {/* Right: the signup form. */}
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
            {tr("Create your trial account")}
          </h2>
          <p
            style={{
              fontSize: 14.5,
              color: C.muted,
              lineHeight: 1.55,
              margin: "8px 0 0",
            }}
          >
            {tr("Your admin login lands in your inbox the moment you submit.")}
          </p>
          <div style={{ marginTop: S[5] }}>
            <DemoForm open />
          </div>
        </div>
      </div>
    </div>
  );
}
