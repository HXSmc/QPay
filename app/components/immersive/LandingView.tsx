"use client";

// Immersive Noir landing narrative for Nuqra (DIRECTION.md §10.1). Full-scroll
// dark world (NOIR + GLOW), single accent hue, motivated motion only. Reuses the
// existing translated MarketingView copy via t() so the Arabic locale gets it
// for free; genuinely new strings are bilingual content chosen through the
// existing useLocale() primitive (this is NOT a new global state system, it is
// the same building block t() is made of).

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SITE } from "../../lib/site";
import {
  C,
  R,
  S,
  SX,
  SHADOW,
  T,
  TX,
  MONO,
  NOIR,
  GLOW,
  STATUS,
  btn,
} from "../../lib/theme";
import { useT, useLocale } from "../../lib/i18n-client";
import { useReveal, staggerDelay } from "../../demo/immersive";
import { usePrefersReducedMotion } from "../../lib/use-reduced-motion";
import {
  PRICING_TIERS,
  TABLES,
  type Bilingual,
  type PlanTier,
  type TableState,
} from "../../demo/_data";
import { BillPreview } from "./BillPreview";

// --- Localized-content helper ----------------------------------------------
// locale-conditional bilingual picker. Same primitive t() builds on; not a new
// state system. `en` is also the SEO/source string.
function useBilingual() {
  const locale = useLocale();
  return (b: Bilingual) => (locale === "ar" ? b.ar : b.en);
}

// useReveal gives {ref, className}; expose a boolean for count-up gating.
function useInView<T extends HTMLElement = HTMLDivElement>(threshold = 0.2) {
  const { ref, className } = useReveal<T>({ threshold });
  return { ref, inView: className === "qp-in" };
}

// --- Count-up (metrics hero figure) ----------------------------------------
// Motivated: the ROI figure "arrives" on scroll into view. Jumps instantly under
// reduced-motion. DIRECTION §10.1.5.
function useCountUp(target: number, run: boolean, reduced: boolean, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (reduced) {
      setVal(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, reduced, duration]);
  return val;
}

// --- Static content ---------------------------------------------------------

const SOLUTION_ICONS = [
  // Pay at the table (QR)
  <svg key="qr" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
  </svg>,
  // Split any bill
  <svg key="split" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>,
  // Digital receipts
  <svg key="receipt" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
    <path d="M12 17.5v-11" />
  </svg>,
  // Live analytics
  <svg key="analytics" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>,
];

const SOLUTIONS: { title: string; body: string }[] = [
  {
    title: "Pay at the table",
    body: "Guests scan, see the live bill, and pay in seconds. The table clears itself, so you never lose a turn waiting on a server to run the check.",
  },
  {
    title: "Split any bill",
    body: "Even, by item, or custom. Each guest pays their share from their own phone, so there is no table math and no counting errors at the till.",
  },
  {
    title: "Digital receipts",
    body: "Itemized receipts land instantly by email or SMS. Paperless, audit-ready, and no reprints at the counter.",
  },
  {
    title: "Live analytics",
    body: "Track revenue, tips, and table turnover in real time, so you can staff the next rush before it hits.",
  },
];

// Pricing tier copy. Tier names are product names; given concise Arabic business
// equivalents. 0% commission restated on every card (the wedge).
const TIER_INFO: Record<PlanTier, { name: Bilingual; features: Bilingual[] }> = {
  Starter: {
    name: { en: "Starter", ar: "الأساسية" },
    features: [
      { en: "Up to 8 tables", ar: "حتى 8 طاولات" },
      { en: "1 branch", ar: "فرع واحد" },
      { en: "QR payments and splits", ar: "مدفوعات QR وتقسيم الفاتورة" },
      { en: "Digital receipts", ar: "إيصالات رقمية" },
    ],
  },
  Growth: {
    name: { en: "Growth", ar: "النمو" },
    features: [
      { en: "Up to 16 tables", ar: "حتى 16 طاولة" },
      { en: "Up to 3 branches", ar: "حتى 3 فروع" },
      { en: "Live analytics", ar: "تحليلات مباشرة" },
      { en: "POS verify, Foodics and Square", ar: "تحقّق نقاط البيع، Foodics وSquare" },
    ],
  },
  Scale: {
    name: { en: "Scale", ar: "التوسّع" },
    features: [
      { en: "Unlimited tables", ar: "طاولات غير محدودة" },
      { en: "Unlimited branches", ar: "فروع غير محدودة" },
      { en: "Priority support", ar: "دعم ذو أولوية" },
      { en: "Dedicated onboarding", ar: "إعداد مخصّص" },
    ],
  },
};

const DEMOS: { href: string; title: Bilingual; desc: Bilingual }[] = [
  {
    href: "/demo/customer",
    title: { en: "Diner bill", ar: "فاتورة الضيف" },
    desc: {
      en: "Scan, split, tip, and pay, exactly as your guests will.",
      ar: "امسح، قسّم، أضف إكرامية، وادفع تمامًا كما سيفعل ضيوفك.",
    },
  },
  {
    href: "/demo/admin",
    title: { en: "Owner dashboard", ar: "لوحة المالك" },
    desc: {
      en: "Revenue, turns, and live orders across every branch.",
      ar: "الإيرادات ودوران الطاولات والطلبات المباشرة عبر كل فرع.",
    },
  },
  {
    href: "/demo/branch",
    title: { en: "Branch floor view", ar: "عرض صالة الفرع" },
    desc: {
      en: "A live mission-control screen for the floor manager.",
      ar: "شاشة تحكّم مباشرة لمدير الصالة.",
    },
  },
];

// TableState -> STATUS kind + bilingual label (DIRECTION §10.4.2 mapping). The
// "paying" state is the one live indicator that earns .qp-glow-pulse.
const TABLE_STATUS: Record<TableState, { kind: keyof typeof STATUS; label: Bilingual }> = {
  available: { kind: "neutral", label: { en: "Available", ar: "متاحة" } },
  seated: { kind: "info", label: { en: "Seated", ar: "جالس" } },
  ordered: { kind: "warn", label: { en: "Ordered", ar: "تم الطلب" } },
  bill_requested: { kind: "warn", label: { en: "Bill requested", ar: "طُلبت الفاتورة" } },
  paying: { kind: "info", label: { en: "Paying", ar: "يدفع الآن" } },
  paid: { kind: "success", label: { en: "Paid", ar: "مدفوعة" } },
  cleaning: { kind: "neutral", label: { en: "Cleaning", ar: "تنظيف" } },
};

const PARTNERS = ["Foodics", "Square", "Marn", "Anywhere"];

// Objection-handling FAQ (reuse exact EN source strings -> Arabic via t()).
const OBJECTIONS: { q: string; a: string }[] = [
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

// General FAQ, doubles as FAQPage JSON-LD (reuse exact EN source strings).
const FAQ_QA: { q: string; a: string }[] = [
  {
    q: "What is Nuqra?",
    a: "Nuqra is scan-to-pay for restaurants: diners scan a table QR, see the live bill, split it, tip, and pay, with no app download.",
  },
  {
    q: "Does Nuqra take a percentage of my sales?",
    a: "No. Nuqra charges a flat monthly fee per branch, not a percentage of your bill, and you keep your own payment processor.",
  },
  {
    q: "Does it work with my POS?",
    a: "Nuqra works alongside 27+ POS systems, including Foodics, Marn, and Anywhere, with read-only verify integrations for Foodics and Square today. Other POS systems are set up manually.",
  },
  {
    q: "Is Arabic supported?",
    a: "Yes. Nuqra is fully bilingual in Arabic and English with right-to-left layout throughout, for both diners and staff.",
  },
  {
    q: "Where is my data stored?",
    a: "Your data lives in a managed cloud database with per-restaurant isolation, so each restaurant's data is scoped to its own account.",
  },
  {
    q: "How do I start?",
    a: "Start a 7-day free trial with no card required. Create your account and we email your admin login immediately.",
  },
];

// --- Component --------------------------------------------------------------

export function LandingView() {
  const tr = useT();
  const b = useBilingual();
  const locale = useLocale();
  const router = useRouter();
  const reduced = usePrefersReducedMotion();
  const rtl = locale === "ar";

  const scrollToId = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });

  // Glowing primary CTA: btn("primary") reskinned onto GLOW.brand with dark ink
  // (white on #22D3EE fails contrast; #05141A passes). DIRECTION §10.1.1.
  const glowCta = (size: "md" | "lg"): CSSProperties => ({
    ...btn("primary", { size }),
    background: GLOW.brand,
    color: "#05141A",
    boxShadow: `0 0 0 1px ${GLOW.brandRing}, 0 8px 24px ${GLOW.brandSoft}`,
  });

  const eyebrowStyle: CSSProperties = { ...TX.eyebrow, color: GLOW.brand };
  const sectionStyle = (pad: number): CSSProperties => ({
    maxWidth: 1120,
    margin: "0 auto",
    padding: `${pad}px 32px`,
  });

  const dhTables = TABLES.filter((t) => t.branchId === "br_dhahran");
  const currency = (n: number) => (rtl ? `${n} ر.س` : `SAR ${n}`);

  return (
    <div style={{ background: "transparent", color: NOIR.text }}>
      {/* ===== 1. HERO ===== */}
      <section
        className="qp-grid-2"
        style={{
          ...sectionStyle(S[7]),
          display: "grid",
          gridTemplateColumns: "1.06fr 0.94fr",
          gap: S[8],
          alignItems: "center",
          // Hero top padding capped at S[6] (32px) before the headline.
          paddingTop: S[6],
        }}
      >
        <div>
          <h1
            style={{
              ...TX.hero,
              color: NOIR.text,
              margin: 0,
              textWrap: "balance",
              maxWidth: 620,
            }}
          >
            {tr("QR payments for restaurants. Get paid before they leave the table.")}
          </h1>
          <p
            style={{
              fontSize: 18,
              lineHeight: 1.55,
              color: NOIR.muted,
              margin: "22px 0 0",
              maxWidth: 480,
            }}
          >
            {tr("Diners scan, split, tip, and pay in under 30 seconds. No app, no waiting on the check.")}
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
            <button type="button" className="qp-cta" onClick={() => router.push("/demo")} style={glowCta("lg")}>
              {tr("Start free trial")}
              <svg style={{ transform: rtl ? "scaleX(-1)" : undefined }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
            <button
              type="button"
              className="qp-press"
              onClick={() => scrollToId("solutions")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 4px",
                background: "transparent",
                color: NOIR.text,
                border: "none",
                fontFamily: "inherit",
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 5,
                textDecorationColor: NOIR.borderStrong,
              }}
            >
              {tr("See how it works")}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 5v14" />
                <path d="m19 12-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Real rendered device art (re-flows under RTL), not a static image. */}
        <div className="qp-hide-mobile" style={{ display: "flex", justifyContent: "center" }}>
          <BillPreview />
        </div>
      </section>

      {/* ===== 2. TRUST STRIP (static row, <=6 marks so no marquee) ===== */}
      <section className="qp-section" style={sectionStyle(S[7])}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: S[5],
            padding: `${S[4]}px ${S[5]}px`,
            background: NOIR.surfaceAlt,
            border: `1px solid ${NOIR.border}`,
            borderRadius: R.lg,
          }}
        >
          <span style={{ ...T.caption, color: NOIR.faint, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {tr("Works alongside your POS")}
          </span>
          {PARTNERS.map((p) => (
            <span key={p} style={{ fontSize: 16, fontWeight: 700, color: NOIR.muted, letterSpacing: "-0.01em" }}>
              {p}
            </span>
          ))}
        </div>
      </section>

      {/* ===== 3. COMMISSION WEDGE (the differentiator) ===== */}
      <CommissionWedge />

      {/* ===== 4. SOLUTIONS (featured glass band + bento) ===== */}
      <Solutions />

      {/* ===== 5. LIVE TABLE STRIP (proof it is real) ===== */}
      <LiveTables />

      {/* ===== 6. DEMOS (شاهد المنتج -> 3 routes) ===== */}
      <Demos />

      {/* ===== 7. METRICS (count-up hero figure + hairline ledger) ===== */}
      <Metrics />

      {/* ===== 8. PRICING ===== */}
      <Pricing />

      {/* ===== 9. OBJECTIONS + 10. FAQ (hairline <dl>, Noir) ===== */}
      <Faqs />

      {/* ===== 11. FOOTER CTA ===== */}
      <FooterCta />
    </div>
  );

  // --- Sub-components (closures over tr/b/glowCta/etc.) -------------------

  function CommissionWedge() {
    const { ref, inView } = useInView();
    const headline: Bilingual = {
      en: "We don't take a cut of your bill.",
      ar: "لا نأخذ نسبة من فاتورتك.",
    };
    const body: Bilingual = {
      en: "One flat monthly fee per branch. You keep your own payment processor and every riyal you collect.",
      ar: "رسم شهري ثابت واحد لكل فرع. تحتفظ بمزوّد الدفع الخاص بك بكل ريال تجمعه.",
    };
    return (
      <section className="qp-section" style={sectionStyle(SX[9])}>
        <div
          ref={ref}
          className={`qp-reveal-scale ${inView ? "qp-in" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: S[7],
            flexWrap: "wrap",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <div
            className="qp-glow-text qp-count"
            style={{
              ...TX.statFigure,
              color: GLOW.brand,
              lineHeight: 1,
              minWidth: 200,
            }}
          >
            {"0%"}
          </div>
          <div style={{ maxWidth: 560, textAlign: "start" }}>
            <h2 style={{ ...TX.display, color: NOIR.text, margin: 0, textWrap: "balance" }}>{b(headline)}</h2>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: NOIR.muted, margin: "16px 0 0" }}>{b(body)}</p>
          </div>
        </div>
      </section>
    );
  }

  function Solutions() {
    const { ref, inView } = useInView();
    return (
      <section id="solutions" className="qp-section" style={{ ...sectionStyle(SX[9]), scrollMarginTop: 80 }}>
        <div style={{ maxWidth: 640, marginBottom: S[7] }}>
          <div style={eyebrowStyle}>{tr("Everything at the table")}</div>
          <h2 style={{ ...TX.display, color: NOIR.text, margin: "14px 0 0", textWrap: "balance" }}>
            {tr("One QR code. Every way to pay.")}
          </h2>
          <p style={{ fontSize: 17, color: NOIR.muted, margin: "16px 0 0", lineHeight: 1.55 }}>
            {tr("Built for the rush. Nuqra removes the slowest part of the meal, the wait for the check.")}
          </p>
        </div>

        <div ref={ref} style={{ display: "grid", gap: S[4] }}>
          {/* Featured band: glass over a soft brand radial. */}
          <div
            className={`qp-solution qp-glass qp-reveal-up ${inView ? "qp-in" : ""}`}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: S[6],
              flexWrap: "wrap",
              padding: "32px 32px",
              borderRadius: R.xl,
              overflow: "hidden",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background: `radial-gradient(120% 140% at 12% 0%, ${GLOW.brandSoft}, transparent 60%)`,
                pointerEvents: "none",
              }}
            />
            <div style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: S[5], maxWidth: 560 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  flexShrink: 0,
                  borderRadius: R.lg,
                  background: GLOW.brand,
                  color: "#05141A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {SOLUTION_ICONS[0]}
              </div>
              <div>
                <h3 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: NOIR.text, margin: "2px 0 8px" }}>
                  {tr(SOLUTIONS[0].title)}
                </h3>
                <p style={{ fontSize: 15.5, color: NOIR.muted, lineHeight: 1.6, margin: 0 }}>{tr(SOLUTIONS[0].body)}</p>
              </div>
            </div>
            <div
              aria-hidden="true"
              className="qp-hide-mobile"
              style={{
                position: "relative",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: S[4],
                padding: "14px 18px",
                background: NOIR.surfaceAlt,
                border: `1px solid ${NOIR.border}`,
                borderRadius: R.lg,
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: NOIR.muted }}>{tr("Table 12")}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: NOIR.text, marginTop: 2, ...MONO }}>{currency(77.49)}</div>
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
                  color: GLOW.brand,
                  background: GLOW.brandSoft,
                  border: `1px solid ${GLOW.brandRing}`,
                  borderRadius: R.pill,
                  padding: "5px 11px",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-4-4" />
                </svg>
                {tr("Paid")}
              </span>
            </div>
          </div>

          {/* Bento: alternating NOIR.surface / NOIR.surfaceAlt, never two alike adjacent. */}
          <div className="qp-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: S[4] }}>
            {SOLUTIONS.slice(1).map((sol, i) => {
              const dark = i % 2 === 0; // index 1 -> surface, 2 -> surfaceAlt, 3 -> surface
              return (
                <div
                  key={sol.title}
                  className={`qp-solution qp-reveal-up ${staggerDelay(i)} ${inView ? "qp-in" : ""}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    padding: "26px 24px",
                    borderRadius: R.lg,
                    background: dark ? NOIR.surface : NOIR.surfaceAlt,
                    border: `1px solid ${NOIR.border}`,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      borderRadius: R.md,
                      background: dark ? NOIR.surfaceAlt : NOIR.surface,
                      color: GLOW.brand,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {SOLUTION_ICONS[i + 1]}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", color: NOIR.text, margin: "18px 0 8px" }}>
                    {tr(sol.title)}
                  </h3>
                  <p style={{ fontSize: 14.5, color: NOIR.muted, lineHeight: 1.55, margin: 0 }}>{tr(sol.body)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  function LiveTables() {
    const { ref, inView } = useInView(0.15);
    const header: Bilingual = { en: "A real floor, not a mockup.", ar: "صالة حقيقية، لا نموذج تجريبي." };
    const body: Bilingual = {
      en: "14 tables at the Dhahran pilot branch, updating live.",
      ar: "14 طاولة في فرع الظهران التجريبي، تتحدّث مباشرة.",
    };
    return (
      <section className="qp-section" style={sectionStyle(SX[9])}>
        <div style={{ maxWidth: 640, marginBottom: S[6] }}>
          <div style={eyebrowStyle}>{b({ en: "Live right now", ar: "مباشر الآن" })}</div>
          <h2 style={{ ...TX.display, color: NOIR.text, margin: "14px 0 0", textWrap: "balance" }}>{b(header)}</h2>
          <p style={{ fontSize: 17, color: NOIR.muted, margin: "16px 0 0", lineHeight: 1.55 }}>{b(body)}</p>
        </div>
        <div ref={ref} className="qp-scroll-x" style={{ overflowX: "auto", paddingBottom: S[3] }}>
          <div
            style={{
              display: "flex",
              gap: S[3],
              minWidth: "min-content",
            }}
          >
            {dhTables.map((t, i) => {
              const st = TABLE_STATUS[t.state];
              const paying = t.state === "paying";
              const sc = STATUS[st.kind];
              return (
                <div
                  key={t.id}
                  className={`qp-reveal-up ${staggerDelay(i % 6)} ${inView ? "qp-in" : ""}`}
                  style={{
                    flex: "0 0 auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    padding: "14px 16px",
                    minWidth: 150,
                    background: NOIR.surfaceAlt,
                    border: `1px solid ${paying ? GLOW.brandRing : NOIR.border}`,
                    borderRadius: R.lg,
                    boxShadow: paying ? `0 0 24px ${GLOW.brandSoft}` : undefined,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: NOIR.text }}>
                      {b({ en: `Table ${t.number}`, ar: `طاولة ${t.number}` })}
                    </span>
                    {/* Color carries meaning, so a text label always accompanies it. */}
                    <span
                      className={paying ? "qp-glow-pulse" : ""}
                      aria-hidden="true"
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: paying ? GLOW.brand : sc.fg,
                        flexShrink: 0,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: paying ? GLOW.brand : sc.fg }}>{b(st.label)}</span>
                  {t.currentTotalSar != null && (
                    <span style={{ fontSize: 13, color: NOIR.muted, ...MONO }}>{currency(t.currentTotalSar)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  function Demos() {
    const { ref, inView } = useInView();
    const header: Bilingual = { en: "Explore the live demo", ar: "استكشف العرض المباشر" };
    const cta: Bilingual = { en: "See the product", ar: "شاهد المنتج" };
    return (
      <section className="qp-section" style={sectionStyle(SX[9])}>
        <div style={{ maxWidth: 640, marginBottom: S[6] }}>
          <h2 style={{ ...TX.display, color: NOIR.text, margin: 0, textWrap: "balance" }}>{b(header)}</h2>
        </div>
        <div
          ref={ref}
          className="qp-grid-2"
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, borderTop: `1px solid ${NOIR.border}` }}
        >
          {DEMOS.map((d, i) => (
            <Link
              key={d.href}
              href={d.href}
              className={`qp-solution qp-reveal-up ${staggerDelay(i)} ${inView ? "qp-in" : ""}`}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: S[6],
                borderInlineEnd: i < DEMOS.length - 1 ? `1px solid ${NOIR.border}` : undefined,
                textDecoration: "none",
                color: NOIR.text,
                background: "transparent",
                borderRadius: 0,
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>{b(d.title)}</span>
              <span style={{ fontSize: 14.5, color: NOIR.muted, lineHeight: 1.55, flex: 1 }}>{b(d.desc)}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 14, fontWeight: 700, color: GLOW.brand }}>
                {b(cta)}
                {/* Directional arrow: mirrored under RTL via inline scaleX(-1)
                    (DIRECTION §8.3; can't add a globals.css class out of scope). */}
                <svg
                  style={{ transform: rtl ? "scaleX(-1)" : undefined }}
                  width="16"
                  height="16"
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
              </span>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  function Metrics() {
    const { ref, inView } = useInView(0.3);
    const hero = SITE.metrics[0];
    const heroTarget = Number(hero.value);
    const counted = useCountUp(Number.isFinite(heroTarget) ? heroTarget : 0, inView, reduced);
    return (
      <section className="qp-section" style={sectionStyle(SX[9])}>
        <div
          ref={ref}
          className={`qp-reveal-up ${inView ? "qp-in" : ""}`}
          style={{
            position: "relative",
            overflow: "hidden",
            background: NOIR.surface,
            border: `1px solid ${NOIR.border}`,
            borderRadius: R.xl,
            padding: `${SX[9]}px ${S[8]}px`,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: S[8],
            alignItems: "center",
          }}
        >
          <div aria-hidden="true" style={{ position: "absolute", top: -130, insetInlineStart: -130, width: 380, height: 380, borderRadius: "50%", border: `1px solid ${GLOW.brandRing}`, opacity: 0.4 }} />
          <div style={{ position: "relative" }}>
            <h2 style={{ ...TX.display, color: NOIR.text, margin: 0, maxWidth: 420 }}>{tr("The math works in your favor")}</h2>
            <p style={{ fontSize: 16, color: NOIR.muted, margin: "16px 0 36px", maxWidth: 380, lineHeight: 1.55 }}>
              {tr("An illustrative model of what faster table-side checkout can add up to over a full service. Your numbers will vary.")}
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, direction: "ltr", unicodeBidi: "isolate" }}>
              <span className="qp-count" style={{ ...TX.statFigure, color: GLOW.brand, ...MONO }}>{counted}</span>
              <span style={{ fontSize: 34, fontWeight: 600, color: GLOW.brand, ...MONO }}>{hero.unit}</span>
            </div>
            <div style={{ fontSize: 15, color: NOIR.muted, marginTop: 14, fontWeight: 500 }}>{tr(hero.label)}</div>
          </div>
          <div style={{ position: "relative" }}>
            {SITE.metrics.slice(1).map((m) => (
              <div
                key={m.label}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 20,
                  padding: "22px 0",
                  borderTop: `1px solid ${NOIR.border}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, direction: "ltr", unicodeBidi: "isolate" }}>
                  <span style={{ fontSize: 44, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1, color: NOIR.text, ...MONO }}>{m.value}</span>
                  <span style={{ fontSize: 20, fontWeight: 600, color: NOIR.muted, ...MONO }}>{m.unit}</span>
                </div>
                <div style={{ fontSize: 14.5, color: NOIR.muted, fontWeight: 500, textAlign: "end", maxWidth: 180 }}>{tr(m.label)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  function Pricing() {
    const { ref, inView } = useInView();
    const header: Bilingual = { en: "Flat fees. Zero commission.", ar: "رسوم ثابتة. بلا عمولة." };
    const sub: Bilingual = { en: "Pick a plan per branch. Cancel anytime.", ar: "اختر باقة لكل فرع. ألغِ في أي وقت." };
    const perMonth: Bilingual = { en: "/mo per branch", ar: "/شهريًا لكل فرع" };
    const popular: Bilingual = { en: "Popular", ar: "الأكثر اختيارًا" };
    const flatNote: Bilingual = { en: "0% of every bill", ar: "0% من كل فاتورة" };
    return (
      <section id="pricing" className="qp-section" style={{ ...sectionStyle(SX[9]), scrollMarginTop: 80 }}>
        <div style={{ maxWidth: 640, marginBottom: S[7] }}>
          <div style={eyebrowStyle}>{b({ en: "Pricing", ar: "التسعير" })}</div>
          <h2 style={{ ...TX.display, color: NOIR.text, margin: "14px 0 0", textWrap: "balance" }}>{b(header)}</h2>
          <p style={{ fontSize: 17, color: NOIR.muted, margin: "16px 0 0", lineHeight: 1.55 }}>{b(sub)}</p>
        </div>
        <div ref={ref} className="qp-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: S[4], alignItems: "stretch" }}>
          {PRICING_TIERS.map((tier, i) => {
            const info = TIER_INFO[tier.tier];
            const isPop = !!tier.popular;
            return (
              <div
                key={tier.tier}
                className={`qp-solution qp-reveal-scale ${staggerDelay(i)} ${inView ? "qp-in" : ""}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: S[6],
                  borderRadius: R.lg,
                  background: isPop ? NOIR.surface : NOIR.surfaceAlt,
                  border: `1px solid ${isPop ? GLOW.brandRing : NOIR.border}`,
                  boxShadow: isPop ? `0 0 32px ${GLOW.brandSoft}` : undefined,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: NOIR.text }}>{b(info.name)}</span>
                  {isPop && (
                    <span style={{ background: C.brand, color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", padding: "4px 10px", borderRadius: R.pill }}>
                      {b(popular)}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "18px 0 4px", direction: "ltr", unicodeBidi: "isolate" }}>
                  <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em", color: NOIR.text, ...MONO }}>{tier.priceSar}</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: NOIR.muted, ...MONO }}>SAR</span>
                </div>
                <div style={{ fontSize: 13, color: NOIR.faint }}>{b(perMonth)}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: GLOW.brand, marginTop: 10 }}>{b(flatNote)}</div>
                <ul style={{ listStyle: "none", padding: 0, margin: "20px 0 0", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                  {info.features.map((f) => (
                    <li key={f.en} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 14, color: NOIR.muted, lineHeight: 1.5 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GLOW.brand} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 3 }}>
                        <path d="M20 6 9 17l-4-4" />
                      </svg>
                      {b(f)}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="qp-cta"
                  onClick={() => router.push("/demo")}
                  style={{ ...glowCta("md"), width: "100%", marginTop: S[5] }}
                >
                  {tr("Start free trial")}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  function Faqs() {
    const renderDl = (items: { q: string; a: string }[], eyebrowText?: string, heading?: string) => (
      <div className="qp-section" style={sectionStyle(S[6])}>
        {(eyebrowText || heading) && (
          <div style={{ maxWidth: 640, marginBottom: S[6] }}>
            {eyebrowText && <div style={eyebrowStyle}>{tr(eyebrowText)}</div>}
            {heading && (
              <h2 style={{ ...TX.display, color: NOIR.text, margin: "14px 0 0", textWrap: "balance" }}>{tr(heading)}</h2>
            )}
          </div>
        )}
        <dl style={{ margin: 0 }}>
          {items.map((item) => (
            <div
              key={item.q}
              className="qp-grid-2"
              style={{
                display: "grid",
                gridTemplateColumns: "0.8fr 1.2fr",
                gap: S[6],
                padding: "26px 0",
                borderTop: `1px solid ${NOIR.border}`,
              }}
            >
              <dt style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", color: NOIR.text, margin: 0 }}>{tr(item.q)}</dt>
              <dd style={{ margin: 0, fontSize: 16, color: NOIR.muted, lineHeight: 1.6, maxWidth: 560 }}>{tr(item.a)}</dd>
            </div>
          ))}
        </dl>
      </div>
    );

    return (
      <>
        {/* FAQPage structured data (search intent). */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQ_QA.map((item) => ({
                "@type": "Question",
                name: tr(item.q),
                acceptedAnswer: { "@type": "Answer", text: tr(item.a) },
              })),
            }),
          }}
        />
        {renderDl(OBJECTIONS, "Before you switch", "Less to change than you think.")}
        {renderDl(FAQ_QA, undefined, "Frequently asked questions")}
      </>
    );
  }

  function FooterCta() {
    return (
      <div style={{ borderTop: `1px solid ${NOIR.border}` }}>
        <div className="qp-section" style={{ ...sectionStyle(SX[9]), textAlign: "center" }}>
          <h2 style={{ ...TX.display, color: NOIR.text, margin: 0, textWrap: "balance" }}>
            {tr("Ready to stop chasing checks?")}
          </h2>
          <p style={{ fontSize: 18, color: NOIR.muted, margin: "18px auto 34px", maxWidth: 540, lineHeight: 1.55 }}>
            {tr("Get paid before they leave the table. Setup takes one afternoon, and we email your trial login as soon as you sign up.")}
          </p>
          <div style={{ display: "flex", gap: S[4], justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" className="qp-cta" onClick={() => router.push("/demo")} style={glowCta("lg")}>
              {tr("Start free trial")}
            </button>
            <button type="button" className="qp-press" onClick={() => router.push("/contact")} style={{ ...btn("secondary", { size: "lg" }), background: "transparent", color: NOIR.text, borderColor: NOIR.borderStrong }}>
              {tr("Talk to sales")}
            </button>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${NOIR.border}`, padding: "28px 32px", textAlign: "center", color: NOIR.muted, fontSize: 13.5 }}>
          © {SITE.copyrightYear} {SITE.company} ·{" "}
          <Link href="/privacy" style={{ color: NOIR.muted, textDecoration: "underline" }}>{tr("Privacy")}</Link> ·{" "}
          <Link href="/terms" style={{ color: NOIR.muted, textDecoration: "underline" }}>{tr("Terms")}</Link> ·{" "}
          <Link href="/copyright" style={{ color: NOIR.muted, textDecoration: "underline" }}>{tr("Copyright")}</Link>
        </div>
      </div>
    );
  }
}
