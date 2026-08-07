"use client";

// /demo/customer: mobile-first immersive diner bill showcase.
//
// No-auth, mock-data only (everything sourced from app/demo/_data.ts). This is
// a polished founder-demo of the real diner flow: a guest scans a table QR,
// sees their live itemized bill, picks how to split, adds a tip, and pays in
// the browser. All state is client-side, no network. Light world (C.*) per
// app/demo/DIRECTION.md §1 ("payment UIs read as trustworthy in light").

import { useState } from "react";
import {
  RESTAURANT,
  BRANCHES,
  TABLES,
  ORDERS,
  MENU_ITEMS,
  type PaymentMethod,
  type Bilingual,
} from "../_data";
import { C, R, S, SHADOW, T, MONO, STATUS, MOTION } from "../../lib/theme";
import { fmt } from "../../lib/data";
import { useReveal, staggerDelay } from "../immersive";
import { usePrefersReducedMotion } from "../../lib/use-reduced-motion";

// KSA VAT. The real /customer route inherits a per-restaurant rate; this demo
// surfaces the standard Saudi rate on a SAR bill.
const TAX_RATE = 15;
const CURRENCY = "SAR" as const;

type Locale = "ar" | "en";
type Split = "full" | "even" | "item";
type TipKey = "0" | "10" | "15" | "20" | "custom";

// --- Demo scene: the pilot table (Dhahran, table 3, mid-order) -------------
const TABLE = TABLES.find((t) => t.id === "t_dh_3")!;
const BRANCH = BRANCHES.find((b) => b.id === TABLE.branchId)!;
const ORDER = ORDERS.find((o) => o.id === "ord_3001")!;

// ORDERS reference menu items by menuItemId; resolve each line to its menu item.
const LINE_ITEMS = ORDER.items.map((li) => {
  const item = MENU_ITEMS.find((m) => m.id === li.menuItemId)!;
  return { item, qty: li.qty, unit: item.priceSar, line: item.priceSar * li.qty };
});

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Bill totals depend only on module-level LINE_ITEMS/TAX_RATE, compute once here.
const SUBTOTAL = round2(LINE_ITEMS.reduce((a, l) => a + l.line, 0));
const TAX = round2(SUBTOTAL * (TAX_RATE / 100));
const TOTAL = round2(SUBTOTAL + TAX);

// --- UI chrome strings (real Gulf-register Arabic, not transliteration) ----
const STR: Record<Locale, Record<string, string>> = {
  ar: {
    billAt: "فاتورتك في",
    table: "طاولة",
    guests: "ضيوف",
    liveBill: "فاتورة مباشرة",
    orderSummary: "ملخص الطلب",
    subtotal: "المجموع الفرعي",
    vat: "ضريبة القيمة المضافة (١٥٪)",
    total: "الإجمالي",
    splitTitle: "كيف تريد التقسيم؟",
    full: "ادفع الكل",
    even: "تقسيم متساوٍ",
    item: "حسب الصنف",
    peopleAtTable: "عدد الأشخاص",
    payingFor: "تدفع عن",
    perPerson: "للشخص",
    youPay: "المطلوب منك",
    byItemHint: "اختر الأصناف التي تريد دفعها.",
    selected: "محدد",
    noneSelected: "لم تختر صنفًا بعد",
    addTip: "أضف إكرامية",
    noTip: "بدون",
    custom: "مبلغ آخر",
    customTip: "إكرامية مخصصة",
    payMethod: "طريقة الدفع",
    pay: "ادفع",
    processing: "جارٍ المعالجة",
    securedBy: "محمي بواسطة Nuqra، تشفير ٢٥٦ بت",
    received: "تم استلام المبلغ",
    paidFor: "المبلغ المدفوع",
    tip: "الإكرامية",
    paidTotal: "الإجمالي المدفوع",
    method: "طريقة الدفع",
    done: "تم",
    payAgain: "عرض الفاتورة من جديد",
    langBtn: "EN",
    langAria: "التبديل إلى الإنجليزية",
  },
  en: {
    billAt: "Your bill at",
    table: "Table",
    guests: "guests",
    liveBill: "Live bill",
    orderSummary: "Order summary",
    subtotal: "Subtotal",
    vat: "VAT (15%)",
    total: "Total",
    splitTitle: "How do you want to split?",
    full: "Pay full",
    even: "Split even",
    item: "By item",
    peopleAtTable: "People at the table",
    payingFor: "You're paying for",
    perPerson: "each",
    youPay: "You pay",
    byItemHint: "Tap the items you want to pay for.",
    selected: "selected",
    noneSelected: "No items selected yet",
    addTip: "Add a tip",
    noTip: "None",
    custom: "Custom",
    customTip: "custom tip",
    payMethod: "Payment method",
    pay: "Pay",
    processing: "Processing",
    securedBy: "Secured by Nuqra, 256-bit encryption",
    received: "Payment received",
    paidFor: "Amount paid",
    tip: "Tip",
    paidTotal: "Total paid",
    method: "Payment method",
    done: "Done",
    payAgain: "View the bill again",
    langBtn: "العربية",
    langAria: "Switch to Arabic",
  },
};

const METHOD_LABELS: Record<Locale, Record<PaymentMethod, string>> = {
  ar: { mada: "مدى", visa: "Visa", applepay: "Apple Pay", stcpay: "stc pay" },
  en: { mada: "mada", visa: "Visa", applepay: "Apple Pay", stcpay: "stc pay" },
};

// Money cell. Every figure renders in the monospace ledger face, isolated LTR
// so "+SAR 30.00" stays sign-first inside Arabic flow.
function Money({
  value,
  size = 15,
  weight = 600,
  color = C.text,
}: {
  value: number;
  size?: number;
  weight?: number;
  color?: string;
}) {
  return (
    <span style={{ ...MONO, fontSize: size, fontWeight: weight, color, whiteSpace: "nowrap" }}>
      {fmt(value, CURRENCY)}
    </span>
  );
}

/** One scroll-reveal element. Each bill line is its own observer target so the
 *  stagger classes (qp-delay-N) read as a sequential first-paint entrance. */
function Reveal({
  children,
  delay,
  variant = "qp-reveal-up",
  style,
}: {
  children: React.ReactNode;
  delay?: string;
  variant?: string;
  style?: React.CSSProperties;
}) {
  const { ref, className } = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} style={style} className={`${variant} ${delay ?? ""} ${className}`}>
      {children}
    </div>
  );
}

export default function DemoCustomerPage() {
  const [locale, setLocale] = useState<Locale>("ar");
  const reduced = usePrefersReducedMotion();
  const tr = (k: string) => STR[locale][k] ?? k;
  const dir = locale === "ar" ? "rtl" : "ltr";
  const pick = (b: Bilingual) => (locale === "ar" ? b.ar : b.en);

  // --- bill totals (module-level consts, see SUBTOTAL/TAX/TOTAL) ---
  const subtotal = SUBTOTAL;
  const tax = TAX;
  const total = TOTAL;

  // --- diner choices ---
  const [split, setSplit] = useState<Split>("full");
  const [peopleAtTable, setPeopleAtTable] = useState(ORDER.guests);
  const [payingFor, setPayingFor] = useState(1);
  const [selected, setSelected] = useState<number[]>(() => LINE_ITEMS.map(() => 0));
  const [tip, setTip] = useState<TipKey>("15");
  const [customTip, setCustomTip] = useState("10.00");
  const [method, setMethod] = useState<PaymentMethod>("mada");
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState<{ principal: number; tip: number; total: number } | null>(
    null,
  );

  const clampedPaying = Math.min(payingFor, peopleAtTable);

  // --- principal per split mode (split math is real, rounded to 2dp) ---
  let principal = total;
  let splitNote = "";
  if (split === "even") {
    const perPerson = round2(total / peopleAtTable);
    principal = round2(perPerson * clampedPaying);
    splitNote = `${fmt(perPerson, CURRENCY)} ${tr("perPerson")} × ${clampedPaying}`;
  } else if (split === "item") {
    const itemSub = round2(selected.reduce((a, s, i) => a + LINE_ITEMS[i].unit * s, 0));
    principal = round2(itemSub * (1 + TAX_RATE / 100));
    const units = selected.reduce((a, s) => a + s, 0);
    splitNote = units === 0 ? tr("noneSelected") : `${units} ${tr("selected")}`;
  }

  const isCustomTip = tip === "custom";
  const tipAmt = isCustomTip
    ? Math.max(0, Number(customTip) || 0)
    : round2(principal * (Number(tip) / 100));
  const payAmount = round2(principal + tipAmt);
  const selectedCount = selected.filter((n) => n > 0).length;
  const canPay = principal > 0 && (split !== "item" || selectedCount > 0) && !paying;

  const setQty = (i: number, q: number) =>
    setSelected((sel) => {
      const next = sel.slice();
      next[i] = Math.max(0, Math.min(q, LINE_ITEMS[i].qty));
      return next;
    });

  const handlePay = () => {
    if (!canPay) return;
    setPaying(true);
    // Mock: no network. Brief processing beat, then success + receipt.
    window.setTimeout(() => {
      setResult({ principal, tip: tipAmt, total: payAmount });
      setPaying(false);
    }, 700);
  };

  const reset = () => {
    setResult(null);
    setSelected(LINE_ITEMS.map(() => 0));
    setSplit("full");
    setTip("15");
  };

  const fontStack =
    locale === "ar"
      ? "var(--font-ar), system-ui, -apple-system, sans-serif"
      : "inherit";

  // Toggle re-mounts the total so its micro-pop keyframe re-fires on tip/split
  // change. Gated by reduced-motion (no animation path then).
  const popKey = `${split}-${tip}-${customTip}-${clampedPaying}-${selected.join("")}`;
  const totalPop = reduced ? undefined : "qpc-totalpop 320ms cubic-bezier(0.34,1.56,0.64,1)";

  return (
    <div
      dir={dir}
      lang={locale}
      style={{
        minHeight: "100vh",
        background: `radial-gradient(130% 70% at 50% 0%, ${C.surfaceAlt}, ${C.canvas} 62%)`,
        color: C.text,
        fontFamily: fontStack,
        WebkitFontSmoothing: "antialiased",
        display: "flex",
        justifyContent: "center",
        padding: "0 0 56px",
      }}
    >
      {/* Total-change micro-pop + live-dot pulse keyframes (reduced-motion gates
          the inline uses, not the @keyframes themselves). */}
      <style>{`@keyframes qpc-totalpop{0%{transform:scale(1)}45%{transform:scale(1.07)}100%{transform:scale(1)}}@keyframes qpc-livepulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.4)}}`}</style>

      <div style={{ width: "100%", maxWidth: 420, padding: "0 16px" }}>
        {/* --- Header: restaurant + table identity (no nav chrome) ---------- */}
        <div
          style={{
            marginTop: 16,
            background: C.surface,
            borderRadius: R.xl,
            overflow: "hidden",
            boxShadow: SHADOW.e3,
            border: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              position: "relative",
              padding: S[5],
              background: C.sky,
              color: C.text,
            }}
          >
            <div
              aria-hidden="true"
              style={{ position: "absolute", insetInline: 0, bottom: 0, height: 2, background: C.brand }}
            />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: S[4] }}>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: C.brand,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}
                >
                  {tr("billAt")}
                </div>
                <div style={{ ...T.h1, fontSize: 24, color: C.text, marginTop: 6, overflowWrap: "break-word" }}>
                  {pick(RESTAURANT.name)}
                </div>
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>
                  {pick(BRANCH.name)}
                </div>
              </div>
              <div
                style={{
                  textAlign: "center",
                  background: C.surface,
                  border: `1px solid ${C.brand}`,
                  borderRadius: R.md,
                  padding: "8px 14px",
                  flexShrink: 0,
                }}
              >
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", color: C.brand }}>
                  {tr("table").toUpperCase()}
                </div>
                <div style={{ ...MONO, fontSize: 24, fontWeight: 700, lineHeight: 1.05, color: C.text }}>
                  {TABLE.number}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: S[3], marginTop: S[4], flexWrap: "wrap" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: C.surface,
                  border: `1px solid ${C.borderStrong}`,
                  padding: "6px 13px",
                  borderRadius: R.pill,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: C.text,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: C.brand,
                    flexShrink: 0,
                    animation: reduced ? undefined : "qpc-livepulse 2.4s ease-in-out infinite",
                  }}
                />
                {tr("liveBill")}
                <span style={{ opacity: 0.6 }}>·</span>
                <span style={{ ...MONO }}>{TABLE.guests ?? ORDER.guests} {tr("guests")}</span>
              </div>
              <button
                type="button"
                onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
                aria-label={tr("langAria")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: R.pill,
                  border: `1px solid ${C.muted}`,
                  background: "transparent",
                  color: C.text,
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  lineHeight: 1,
                  minHeight: 32,
                }}
              >
                {tr("langBtn")}
              </button>
            </div>
          </div>

          <div style={{ padding: `${S[5]}px ${S[5]}px ${S[6]}px` }}>
            {/* --- Success / receipt state replaces the bill controls -------- */}
            {result ? (
              <Reveal variant="qp-reveal-scale" style={{ textAlign: "center", padding: "12px 0 4px" }}>
                <div
                  aria-hidden="true"
                  style={{
                    width: 64,
                    height: 64,
                    margin: "0 auto 16px",
                    borderRadius: "50%",
                    background: STATUS.success.bg,
                    border: `1px solid ${STATUS.success.border}`,
                    color: STATUS.success.fg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-4-4" />
                  </svg>
                </div>
                <div style={{ ...T.h2, color: C.text }}>{tr("received")}</div>
                <div style={{ marginTop: 8 }}>
                  <Money value={result.total} size={T.display.fontSize} weight={700} color={C.brand} />
                </div>

                <div
                  style={{
                    textAlign: "start",
                    marginTop: S[5],
                    padding: "16px 18px",
                    background: C.surfaceAlt,
                    border: `1px solid ${C.border}`,
                    borderRadius: R.lg,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 14, color: C.muted, padding: "3px 0" }}>
                    <span>{tr("paidFor")}</span>
                    <Money value={result.principal} size={14} weight={600} color={C.text} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 14, color: C.muted, padding: "3px 0" }}>
                    <span>{tr("tip")}</span>
                    <Money value={result.tip} size={14} weight={600} color={C.text} />
                  </div>
                  <div style={{ borderTop: `1px dashed ${C.borderStrong}`, margin: "11px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ ...T.h3, fontSize: 16, color: C.text }}>{tr("paidTotal")}</span>
                    <Money value={result.total} size={22} weight={700} color={STATUS.success.fg} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 13, color: C.muted, marginTop: 10 }}>
                    <span>{tr("method")}</span>
                    <span style={{ fontWeight: 600, color: C.muted }}>{METHOD_LABELS[locale][method]}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={reset}
                  className="qp-cta-lift"
                  style={{
                    width: "100%",
                    marginTop: S[5],
                    padding: 15,
                    background: C.brand,
                    color: "#fff",
                    border: "none",
                    borderRadius: R.md,
                    fontFamily: "inherit",
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: SHADOW.cta,
                    transition: `transform ${MOTION.base} ${MOTION.ease}, box-shadow ${MOTION.base} ${MOTION.ease}`,
                    minHeight: 48,
                  }}
                >
                  {tr("done")}
                </button>
              </Reveal>
            ) : (
              <>
                {/* --- Live itemized bill (staggered reveal) ----------------- */}
                <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: S[2] }}>
                  {tr("orderSummary")}
                </div>
                {LINE_ITEMS.map((l, i) => (
                  <Reveal key={l.item.id} delay={staggerDelay(i)}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        minHeight: 48,
                        padding: "11px 0",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <span
                          style={{
                            ...MONO,
                            minWidth: 26,
                            height: 26,
                            padding: "0 6px",
                            borderRadius: R.xs,
                            background: C.brandTint,
                            color: C.brand,
                            fontSize: 13,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {l.qty}
                        </span>
                        <span style={{ fontSize: 15, fontWeight: 600, color: C.text, overflowWrap: "break-word" }}>
                          {pick(l.item.name)}
                        </span>
                      </div>
                      <Money value={l.line} size={15} weight={600} />
                    </div>
                  </Reveal>
                ))}

                {/* Totals */}
                <Reveal delay={staggerDelay(LINE_ITEMS.length)} style={{ marginTop: S[4] }}>
                  <div style={{ padding: "16px 18px", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: R.lg }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 14, color: C.muted, padding: "3px 0" }}>
                      <span>{tr("subtotal")}</span>
                      <Money value={subtotal} size={14} weight={600} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 14, color: C.muted, padding: "3px 0" }}>
                      <span>{tr("vat")}</span>
                      <Money value={tax} size={14} weight={600} />
                    </div>
                    <div style={{ borderTop: `1px dashed ${C.borderStrong}`, margin: "11px 0" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ ...T.h3, fontSize: 16, color: C.text }}>{tr("total")}</span>
                      <Money value={total} size={24} weight={700} color={C.brand} />
                    </div>
                  </div>
                </Reveal>

                {/* --- Split control --------------------------------------- */}
                <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.09em", textTransform: "uppercase", margin: `${S[6]}px 0 ${S[3]}px` }}>
                  {tr("splitTitle")}
                </div>
                <div style={{ display: "flex", gap: S[2] }}>
                  {(["full", "even", "item"] as const).map((k) => {
                    const active = split === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setSplit(k)}
                        aria-pressed={active}
                        style={{
                          flex: 1,
                          minHeight: 48,
                          padding: "11px 8px",
                          borderRadius: R.md,
                          cursor: "pointer",
                          textAlign: "center",
                          fontFamily: "inherit",
                          fontSize: 13.5,
                          fontWeight: 700,
                          transition: `all 220ms ${MOTION.ease}`,
                          border: `1.5px solid ${active ? C.brand : C.border}`,
                          background: active ? C.brandTint : C.surface,
                          color: active ? C.brand : C.text,
                        }}
                      >
                        {tr(k)}
                      </button>
                    );
                  })}
                </div>

                {/* Even split controls */}
                {split === "even" && (
                  <div style={{ marginTop: S[3], padding: "6px 16px 14px", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: R.lg }}>
                    <StepperRow
                      label={tr("peopleAtTable")}
                      ariaDec={tr("peopleAtTable")}
                      ariaInc={tr("peopleAtTable")}
                      value={peopleAtTable}
                      onDec={() => setPeopleAtTable((p) => Math.max(1, p - 1))}
                      onInc={() => setPeopleAtTable((p) => Math.min(20, p + 1))}
                    />
                    <div style={{ borderTop: `1px solid ${C.border}`, margin: 0 }} />
                    <StepperRow
                      label={tr("payingFor")}
                      ariaDec={tr("payingFor")}
                      ariaInc={tr("payingFor")}
                      value={clampedPaying}
                      onDec={() => setPayingFor((p) => Math.max(1, p - 1))}
                      onInc={() => setPayingFor((p) => Math.min(peopleAtTable, p + 1))}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 8, paddingTop: 12, borderTop: `1px dashed ${C.borderStrong}` }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{tr("youPay")}</div>
                        <div style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{splitNote}</div>
                      </div>
                      <Money value={principal} size={21} weight={700} color={C.brand} />
                    </div>
                  </div>
                )}

                {/* By-item selection */}
                {split === "item" && (
                  <div style={{ marginTop: S[3] }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: C.muted, marginBottom: S[2] }}>
                      {tr("byItemHint")}
                    </div>
                    {LINE_ITEMS.map((l, i) => {
                      const q = selected[i] ?? 0;
                      const isMulti = l.qty > 1;
                      return (
                        <div
                          key={l.item.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            minHeight: 52,
                            padding: "10px 13px",
                            marginBottom: 7,
                            borderRadius: R.md,
                            transition: `all 220ms ${MOTION.ease}`,
                            border: `1.5px solid ${q > 0 ? C.brand : C.border}`,
                            background: q > 0 ? C.brandTint : C.surface,
                          }}
                        >
                          {/* Stepper for multi-qty lines, single toggle otherwise */}
                          {isMulti ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                              <ItemStep ariaLabel={tr("payingFor")} disabled={q <= 0} onClick={() => setQty(i, q - 1)}>
                                −
                              </ItemStep>
                              <span style={{ ...MONO, fontSize: 13, fontWeight: 700, minWidth: 34, textAlign: "center", color: C.text }}>
                                {q}/{l.qty}
                              </span>
                              <ItemStep ariaLabel={tr("payingFor")} disabled={q >= l.qty} onClick={() => setQty(i, q + 1)}>
                                +
                              </ItemStep>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setQty(i, q > 0 ? 0 : 1)}
                              aria-pressed={q > 0}
                              aria-label={`${pick(l.item.name)}, ${fmt(l.unit, CURRENCY)}`}
                              style={{
                                width: 24,
                                height: 24,
                                flexShrink: 0,
                                borderRadius: R.xs,
                                border: `1.5px solid ${q > 0 ? C.brand : C.borderStrong}`,
                                background: q > 0 ? C.brand : C.surface,
                                color: "#fff",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: 0,
                              }}
                            >
                              {q > 0 && (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 6 9 17l-4-4" />
                                </svg>
                              )}
                            </button>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14.5, fontWeight: 600, color: C.text }}>{pick(l.item.name)}</div>
                            <div style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>
                              {isMulti ? `${l.qty} × ${fmt(l.unit, CURRENCY)}` : fmt(l.unit, CURRENCY)}
                            </div>
                          </div>
                          <Money value={round2(l.unit * q)} size={14} weight={700} color={q > 0 ? C.brand : C.muted} />
                        </div>
                      );
                    })}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 6, padding: "12px 14px", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: R.md }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{tr("youPay")}</div>
                        <div style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{splitNote}</div>
                      </div>
                      <Money value={principal} size={21} weight={700} color={C.brand} />
                    </div>
                  </div>
                )}

                {/* --- Tip selector --------------------------------------- */}
                <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.09em", textTransform: "uppercase", margin: `${S[6]}px 0 ${S[3]}px` }}>
                  {tr("addTip")}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 7 }}>
                  {(["0", "10", "15", "20", "custom"] as const).map((k) => {
                    const active = tip === k;
                    const label = k === "custom" ? tr("custom") : k === "0" ? tr("noTip") : `${k}%`;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setTip(k)}
                        aria-pressed={active}
                        style={{
                          minHeight: 48,
                          padding: "11px 0",
                          borderRadius: R.md,
                          cursor: "pointer",
                          textAlign: "center",
                          fontFamily: "inherit",
                          fontSize: 13,
                          fontWeight: 700,
                          transition: `all 220ms ${MOTION.ease}`,
                          border: `1.5px solid ${active ? C.brand : C.border}`,
                          background: active ? C.brandTint : C.surface,
                          color: active ? C.brand : C.muted,
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {isCustomTip && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: S[3], padding: "11px 14px", border: `1.5px solid ${C.brand}`, borderRadius: R.md, background: C.brandTint }}>
                    <span style={{ ...MONO, fontSize: 17, fontWeight: 700, color: C.brand }}>SAR</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      aria-label={tr("customTip")}
                      value={customTip}
                      onChange={(e) => {
                        setCustomTip(e.target.value);
                        setTip("custom");
                      }}
                      placeholder="0.00"
                      style={{ ...MONO, border: "none", background: "transparent", outline: "none", fontSize: 17, fontWeight: 700, width: "100%", color: C.text }}
                    />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: C.muted, whiteSpace: "nowrap" }}>{tr("customTip")}</span>
                  </div>
                )}

                {/* --- Total + pay (total re-pops on change) --------------- */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: S[3], marginTop: S[6] }}>
                  <span style={{ ...T.h3, fontSize: 16, color: C.text }}>{tr("total")}</span>
                  <span key={popKey} style={{ display: "inline-block", animation: totalPop }}>
                    <Money value={payAmount} size={T.display.fontSize} weight={700} color={C.brand} />
                  </span>
                </div>

                {/* Payment method row (brand names as text, not hand-drawn logos) */}
                <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.09em", textTransform: "uppercase", margin: `${S[4]}px 0 ${S[2]}px` }}>
                  {tr("payMethod")}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: S[2] }}>
                  {(["mada", "visa", "applepay", "stcpay"] as const).map((m) => {
                    const active = method === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMethod(m)}
                        aria-pressed={active}
                        style={{
                          minHeight: 48,
                          padding: "12px 10px",
                          borderRadius: R.md,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          fontSize: 13.5,
                          fontWeight: 700,
                          transition: `all 220ms ${MOTION.ease}`,
                          border: `1.5px solid ${active ? C.brand : C.border}`,
                          background: active ? C.brandTint : C.surface,
                          color: active ? C.brand : C.text,
                        }}
                      >
                        {METHOD_LABELS[locale][m]}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handlePay}
                  disabled={!canPay}
                  className="qp-cta-lift"
                  aria-label={`${tr("pay")} ${fmt(payAmount, CURRENCY)}`}
                  style={{
                    width: "100%",
                    marginTop: S[5],
                    padding: 17,
                    background: C.brand,
                    color: "#fff",
                    border: "none",
                    borderRadius: R.md,
                    fontFamily: "inherit",
                    fontSize: 17,
                    fontWeight: 700,
                    cursor: canPay ? "pointer" : "default",
                    opacity: canPay ? 1 : 0.55,
                    boxShadow: SHADOW.cta,
                    transition: `transform ${MOTION.base} ${MOTION.ease}, box-shadow ${MOTION.base} ${MOTION.ease}, opacity ${MOTION.base} ${MOTION.ease}`,
                    minHeight: 52,
                  }}
                >
                  {paying ? (
                    tr("processing")
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}>
                      {tr("pay")} <Money value={payAmount} size={17} weight={700} color="#fff" />
                    </span>
                  )}
                </button>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: S[3], color: C.muted, fontSize: 12, fontWeight: 600 }}>
                  <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  {tr("securedBy")}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Small local controls --------------------------------------------------

function StepperRow({
  label,
  ariaDec,
  ariaInc,
  value,
  onDec,
  onInc,
}: {
  label: string;
  ariaDec: string;
  ariaInc: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
}) {
  const btn: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: R.sm,
    border: `1.5px solid ${C.border}`,
    background: C.surface,
    color: C.brand,
    fontFamily: "inherit",
    fontSize: 19,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    padding: 0,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <button type="button" onClick={onDec} aria-label={ariaDec} style={btn}>−</button>
        <span style={{ ...MONO, fontSize: 17, fontWeight: 700, minWidth: 22, textAlign: "center", color: C.text }}>{value}</span>
        <button type="button" onClick={onInc} aria-label={ariaInc} style={btn}>+</button>
      </div>
    </div>
  );
}

function ItemStep({
  children,
  onClick,
  disabled,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        width: 30,
        height: 30,
        borderRadius: R.xs,
        border: `1.5px solid ${C.borderStrong}`,
        background: C.surface,
        color: C.brand,
        fontFamily: "inherit",
        fontSize: 17,
        fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
        padding: 0,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}
