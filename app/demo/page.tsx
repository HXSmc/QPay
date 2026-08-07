import type { Metadata } from "next";
import Link from "next/link";
import { BrandHeader } from "../components/site/BrandHeader";
import { DemoForm } from "../components/site/DemoForm";
import { getServerLocale } from "../lib/i18n-server";
import { t } from "../lib/i18n";
import { C, R, S, T, card } from "../lib/theme";
import type { Bilingual } from "./_data";

// Explore-the-demos links. The demo page's editorial strings normally route
// through the global AR dictionary (app/lib/i18n/ar-*.ts), but those files are
// outside this task's ownership, so these few strings carry their own {en,ar}
// pair instead of falling back to English via t().
const DEMO_LINKS: { href: string; title: Bilingual; body: Bilingual }[] = [
  {
    href: "/demo/admin",
    title: { en: "Group admin demo", ar: "تجربة إدارة المجموعة" },
    body: { en: "The full group dashboard across branches.", ar: "لوحة التحكم الكاملة عبر الفروع." },
  },
  {
    href: "/demo/branch",
    title: { en: "Branch admin demo", ar: "تجربة إدارة الفرع" },
    body: { en: "One branch's live floor and tables.", ar: "صالة فرعٍ واحد وطاولاته مباشرة." },
  },
  {
    href: "/demo/customer",
    title: { en: "Customer demo", ar: "تجربة العميل" },
    body: { en: "The diner flow: split, tip, and pay.", ar: "تجربة الضيف: تقسيم، إكرامية، ودفع." },
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return locale === "ar"
    ? {
        title: "ابدأ تجربتك المجانية · نقرة",
        description:
          "أنشئ حساب نقرة التجريبي. نرسل بيانات دخول المشرف إلى بريدك فورًا لتستقبل أول دفعة خلال دقائق.",
      }
    : {
        title: "Start your free trial · Nuqra",
        description:
          "Create a Nuqra trial account. We email your admin login on the spot so you can take a payment in minutes.",
      };
}

const PERKS = [
  {
    title: "Live in minutes",
    body: "Get a working admin account by email, add a table, and take your first QR payment the same afternoon.",
  },
  {
    title: "No card, no commitment",
    body: "A 7-day trial with full feature access. Bring your own menu and tax rate, or start from a clean slate.",
  },
  {
    title: "Real diner flow",
    body: "Scan, split, tip, and pay end to end, exactly as your guests will use it on the floor.",
  },
];

export default async function DemoPage() {
  const locale = await getServerLocale();
  const tr = (s: string) => t(s, locale);
  const bi = (b: Bilingual) => (locale === "ar" ? b.ar : b.en);
  const dir = locale === "ar" ? "rtl" : "ltr";

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
            {tr("We'll email your admin login as soon as you submit.")}
          </p>
          <div style={{ marginTop: S[5] }}>
            <DemoForm open />
          </div>
        </div>
      </div>

      {/* Explore the live demos, secondary to the signup form. */}
      <section
        aria-labelledby="qp-demo-explore"
        style={{ maxWidth: 1080, margin: "0 auto", padding: `0 32px 96px` }}
      >
        <div
          id="qp-demo-explore"
          style={{
            ...T.label,
            color: C.muted,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}
        >
          {bi({ en: "Explore the live demos", ar: "استكشف العروض الحية" })}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: S[4],
            marginTop: S[4],
          }}
        >
          {DEMO_LINKS.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              dir={dir}
              style={{
                ...card({ pad: S[5], radius: R.lg }),
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                gap: S[2],
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: S[2] }}>
                <span style={{ ...T.h3, color: C.text }}>{bi(d.title)}</span>
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
                  style={{ color: C.brand, transform: dir === "rtl" ? "scaleX(-1)" : undefined, flexShrink: 0 }}
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </div>
              <p style={{ fontSize: 14.5, color: C.muted, lineHeight: 1.55, margin: 0 }}>
                {bi(d.body)}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
