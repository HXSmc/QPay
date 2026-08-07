"use client";

// /demo/branch: branch-manager live floor view (Noir mission-control).
// Single-branch context: br_dhahran (the pilot). All data from app/demo/_data.ts.
// Arabic-first RTL default, EN toggle, tablet-first (1024px landscape).
// Self-contained: local locale state, local UI string dictionary, deterministic
// demo clock anchored to the shift's mock evening (no real-time / Date.now() so
// server and client render identically and elapsed minutes stay sensible).

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  NOIR,
  GLOW,
  R,
  S,
  T,
  TX,
  MONO,
  NUM,
  btn,
  noirCard,
} from "../../lib/theme";
import { useReveal } from "../immersive";
import {
  RESTAURANT,
  BRANCHES,
  TABLES,
  ORDERS,
  TRANSACTIONS,
  ANALYTICS_DHAHRAN,
  STAFF,
  MENU_ITEMS,
  type Table,
  type TableState,
} from "../_data";

// --- Locale -----------------------------------------------------------------

type Locale = "ar" | "en";

// Bilingual string pair, mirroring the Bilingual shape in _data.ts (which we
// may not import as a type without coupling; this local alias keeps the chrome
// dictionary self-contained).
type Locale2 = { en: string; ar: string };

// --- UI string dictionary (chrome only; content data stays in _data.ts) ------

const UI = {
  floorOps: { ar: "إدارة الصالة", en: "Floor operations" },
  language: { ar: "EN", en: "ع" },
      occupancy: { ar: "إشغال الطاولات", en: "Table occupancy" },
  liveShift: { ar: "الوردية الحية", en: "Live shift" },
  covers: { ar: "الزبائن", en: "Covers" },
  revenueToday: { ar: "إيراد اليوم", en: "Revenue today" },
  openBills: { ar: "فواتير مفتوحة", en: "Open bills" },
  avgTurn: { ar: "متوسط الدوران", en: "Avg turn" },
  needsAttention: { ar: "يتطلب انتباهًا", en: "Needs attention" },
  noAttention: { ar: "لا يوجد ما يتطلب انتباهًا الآن.", en: "Nothing needs attention right now." },
  floor: { ar: "الصالة", en: "Floor" },
  details: { ar: "التفاصيل", en: "Details" },
  openTickets: { ar: "الطلبات المفتوحة", en: "Open tickets" },
  selectHint: { ar: "اختر طاولة لعرض تفاصيل الطلب.", en: "Select a table to view its order." },
  table: { ar: "طاولة", en: "Table" },
  seats: { ar: "مقاعد", en: "seats" },
  guests: { ar: "ضيوف", en: "guests" },
  seatedFor: { ar: "جلس منذ", en: "Seated for" },
  noOrder: { ar: "لا يوجد طلب مفتوح لهذه الطاولة بعد.", en: "No open order for this table yet." },
  item: { ar: "صنف", en: "Item" },
  qty: { ar: "الكمية", en: "Qty" },
  orderTotal: { ar: "إجمالي الطلب", en: "Order total" },
  amountDue: { ar: "المبلغ المستحق", en: "Amount due" },
  backToTickets: { ar: "العودة إلى الطلبات", en: "Back to tickets" },
  staffOnShift: { ar: "فريق الوردية", en: "Staff on shift" },
  endOfDay: { ar: "ملخص نهاية اليوم", en: "End of day" },
  totalRevenue: { ar: "إجمالي الإيراد", en: "Total revenue" },
  totalTips: { ar: "إجمالي البقشيش", en: "Total tips" },
  transactions: { ar: "عمليات الدفع", en: "Transactions" },
  tipRate: { ar: "نسبة البقشيش", en: "Tip rate" },
  paymentMix: { ar: "توزيع طرق الدفع", en: "Payment method mix" },
  vsYesterday: { ar: "مقارنة بالأمس", en: "vs yesterday" },
  pilotBadge: { ar: "الفرع التجريبي", en: "Pilot branch" },
} satisfies Record<string, Locale2>;

const ROLE_LABEL: Record<string, Locale2> = {
  owner: { ar: "مالك", en: "Owner" },
  branch_manager: { ar: "مدير فرع", en: "Manager" },
  server: { ar: "نادل", en: "Server" },
  cashier: { ar: "كاشير", en: "Cashier" },
};

const PAYMENT_LABEL: Record<string, Locale2> = {
  mada: { ar: "مدى", en: "mada" },
  visa: { ar: "فيزا", en: "Visa" },
  applepay: { ar: "Apple Pay", en: "Apple Pay" },
  stcpay: { ar: "STC Pay", en: "STC Pay" },
};

// --- Table state presentation (dark-tuned) ----------------------------------
// STATUS tokens are tuned for light surfaces; on Noir we use brighter accent
// variants for the dot + label text so they hold contrast on near-black, and a
// NOIR.surfaceAlt pill fill. Color is never the only signal: every state has a
// text label too (a11y §11).

interface StateMeta {
  accent: string;
  label: Locale2;
  pulse?: boolean;
}

const STATE_META: Record<TableState, StateMeta> = {
  available: { accent: "rgba(244,246,248,0.40)", label: { ar: "متاحة", en: "Available" } },
  seated: { accent: "#60A5FA", label: { ar: "جلس", en: "Seated" } },
  ordered: { accent: "#FBBF24", label: { ar: "تحضير", en: "Ordered" } },
  bill_requested: { accent: "#FBBF24", label: { ar: "طلب الفاتورة", en: "Bill requested" }, pulse: true },
  paying: { accent: GLOW.brand, label: { ar: "يدفع الآن", en: "Paying" }, pulse: true },
  paid: { accent: "#4ADE80", label: { ar: "مدفوعة", en: "Paid" } },
  cleaning: { accent: "rgba(244,246,248,0.40)", label: { ar: "تنظيف", en: "Cleaning" } },
};

// --- Demo time anchor -------------------------------------------------------
// Fixed "now" inside the mock evening so elapsed minutes are stable and sensible
// (never real Date.now(), which would jump to nonsensical values vs the mock
// 17:00-18:25 openedAt timestamps and would mismatch server/client render).

const NOW_ANCHOR = new Date("2026-08-07T18:35:00+03:00");
const ANCHOR_WALL_SEC = 18 * 3600 + 35 * 60; // 18:35 wall clock at +03:00

function elapsedMin(iso: string): number {
  return Math.max(0, Math.round((NOW_ANCHOR.getTime() - new Date(iso).getTime()) / 60000));
}

// Long-seated threshold for the needs-attention strip.
const LONG_SEATED_MIN = 60;

// --- Formatting -------------------------------------------------------------

function sar(n: number, locale: Locale): string {
  return n.toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function currencySuffix(locale: Locale): string {
  return locale === "ar" ? "ر.س" : "SAR";
}

/** Money span: figure isolated LTR (MONO), currency label after. */
function Money({
  value,
  locale,
  style,
}: {
  value: number;
  locale: Locale;
  style?: CSSProperties;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5, ...style }}>
      <span style={{ ...MONO }}>{sar(value, locale)}</span>
      <span style={{ fontSize: "0.6em", color: NOIR.muted, fontWeight: 600 }}>
        {currencySuffix(locale)}
      </span>
    </span>
  );
}

function clockText(secOffset: number): string {
  const t = (ANCHOR_WALL_SEC + secOffset) % 86400;
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

// --- Page -------------------------------------------------------------------

export default function BranchFloorPage() {
  const [locale, setLocale] = useState<Locale>("ar");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [secOffset, setSecOffset] = useState(0);

  // Live clock: deterministic anchor on first paint (server + client match),
  // then ticks client-side only.
  useEffect(() => {
    const id = setInterval(() => setSecOffset((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const dir = locale === "ar" ? "rtl" : "ltr";
  const tr = (k: keyof typeof UI) => UI[k][locale];
  const bl = (p: Locale2) => p[locale];

  const branch = BRANCHES.find((b) => b.id === "br_dhahran")!;

  const data = useMemo(() => {
    const tables = TABLES.filter((t) => t.branchId === branch.id);
    const occupied = tables.filter((t) =>
      ["seated", "ordered", "bill_requested", "paying"].includes(t.state),
    );
    const todaysTxns = TRANSACTIONS.filter(
      (x) => x.branchId === branch.id && x.status === "completed",
    );
    const realizedRevenue = todaysTxns.reduce((s, x) => s + x.amountSar, 0);
    const realizedTips = todaysTxns.reduce((s, x) => s + x.tipSar, 0);
    const openBillsTotal = occupied.reduce((s, t) => s + (t.currentTotalSar ?? 0), 0);
    const covers =
      occupied.reduce((s, t) => s + (t.guests ?? 0), 0) +
      todaysTxns.reduce((s, x) => s + x.guestsSplit, 0);
    const avgTurn = ANALYTICS_DHAHRAN[ANALYTICS_DHAHRAN.length - 1].avgTurnMinutes;
    const yesterday = ANALYTICS_DHAHRAN[ANALYTICS_DHAHRAN.length - 2].revenueSar;
    const todayPoint = ANALYTICS_DHAHRAN[ANALYTICS_DHAHRAN.length - 1].revenueSar;
    const deltaPct = Math.round(((todayPoint - yesterday) / yesterday) * 100);

    // Payment mix (completed today).
    const byMethod = new Map<string, number>();
    for (const x of todaysTxns) {
      byMethod.set(x.method, (byMethod.get(x.method) ?? 0) + x.amountSar);
    }
    const mix = [...byMethod.entries()]
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Needs-attention: bill requested, or long-seated while occupied.
    const attention = tables
      .filter((t) => {
        if (!t.openedAt) return false;
        const em = elapsedMin(t.openedAt);
        if (t.state === "bill_requested") return true;
        if (["seated", "ordered"].includes(t.state) && em >= LONG_SEATED_MIN) return true;
        return false;
      })
      .map((t) => ({
        table: t,
        elapsed: elapsedMin(t.openedAt!),
        kind: t.state === "bill_requested" ? ("bill" as const) : ("long" as const),
      }))
      .sort((a, b) => b.elapsed - a.elapsed);

    return {
      tables,
      occupied,
      todaysTxns,
      realizedRevenue,
      realizedTips,
      openBillsTotal,
      covers,
      avgTurn,
      deltaPct,
      mix,
      attention,
    };
  }, [branch.id]);

  const selected = selectedId ? data.tables.find((t) => t.id === selectedId) ?? null : null;

  const fontStack =
    locale === "ar"
      ? "var(--font-ar), system-ui, -apple-system, sans-serif"
      : "inherit";

  return (
    <div
      dir={dir}
      lang={locale}
      style={{
        minHeight: "100vh",
        background: NOIR.canvas,
        color: NOIR.text,
        fontFamily: fontStack,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <StatusBar
        branchName={bl(branch.name)}
        city={bl(branch.city)}
        clock={clockText(secOffset)}
        isPilot={!!branch.isPilot}
        occupancy={{ occupied: data.occupied.length, total: branch.tableCount }}
        onToggleLang={() => setLocale((l) => (l === "ar" ? "en" : "ar"))}
        langLabel={tr("language")}
        tr={tr}
        bl={bl}
      />

      <main style={{ padding: "24px clamp(16px, 3vw, 40px) 64px", maxWidth: 1320, margin: "0 auto" }}>
        <KpiStrip
          data={data}
          locale={locale}
          tr={tr}
        />

        <AttentionStrip items={data.attention} locale={locale} tr={tr} bl={bl} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.55fr) minmax(0, 1fr)",
            gap: 24,
            alignItems: "start",
            marginTop: 24,
          }}
          className="qp-branch-columns"
        >
          <FloorGrid
            tables={data.tables}
            selectedId={selectedId}
            onSelect={setSelectedId}
            locale={locale}
            tr={tr}
            bl={bl}
          />
          <DetailRail
            selected={selected}
            locale={locale}
            tr={tr}
            bl={bl}
            onClear={() => setSelectedId(null)}
          />
        </div>

        <StaffSection branchId={branch.id} locale={locale} tr={tr} bl={bl} />

        <EodSection data={data} locale={locale} tr={tr} bl={bl} />
      </main>

      <style>{`
        @media (max-width: 900px) {
          .qp-branch-columns { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 720px) {
          .qp-branch-kpis { grid-template-columns: repeat(2, 1fr) !important; }
          .qp-branch-eod { grid-template-columns: repeat(2, 1fr) !important; }
          .qp-branch-eodmix { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// --- Status bar -------------------------------------------------------------

function StatusBar({
  branchName,
  city,
  clock,
  isPilot,
  occupancy,
  onToggleLang,
  langLabel,
  tr,
  bl,
}: {
  branchName: string;
  city: string;
  clock: string;
  isPilot: boolean;
  occupancy: { occupied: number; total: number };
  onToggleLang: () => void;
  langLabel: string;
  tr: (k: keyof typeof UI) => string;
  bl: (p: Locale2) => string;
}) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "rgba(8,10,13,0.86)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: `1px solid ${NOIR.border}`,
      }}
    >
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "14px clamp(16px, 3vw, 40px)",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ ...TX.eyebrow, color: NOIR.faint }}>
              {bl(RESTAURANT.name) /* content data, bilingual */}
            </span>
            {isPilot && (
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: GLOW.brand,
                  border: `1px solid ${GLOW.brandRing}`,
                  borderRadius: R.pill,
                  padding: "2px 8px",
                }}
              >
                {tr("pilotBadge")}
              </span>
            )}
          </div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>
            {branchName}
            <span style={{ color: NOIR.muted, fontWeight: 400 }}> · {city}</span>
          </h1>
        </div>

        <div style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 18 }}>
          <Stat label={tr("occupancy")} value={`${occupancy.occupied} / ${occupancy.total}`} />
          <div style={{ width: 1, alignSelf: "stretch", background: NOIR.border }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            <span style={{ ...TX.eyebrow, color: NOIR.faint }}>{tr("liveShift")}</span>
            <span style={{ ...NUM, fontSize: 18, fontWeight: 600, color: NOIR.text }}>
              <LiveDot /> {clock}
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleLang}
            aria-label={langLabel}
            style={{
              ...btn("secondary"),
              background: NOIR.surface,
              color: NOIR.text,
              borderColor: NOIR.borderStrong,
              minWidth: 44,
              minHeight: 44,
              padding: "0 12px",
            }}
          >
            {langLabel}
          </button>
        </div>
      </div>
    </header>
  );
}

function LiveDot() {
  return (
    <span
      aria-hidden="true"
      className="qp-glow-pulse"
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: R.pill,
        background: GLOW.brand,
        marginInlineEnd: 6,
        verticalAlign: "middle",
      }}
    />
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
      <span style={{ ...TX.eyebrow, color: NOIR.faint }}>{label}</span>
      <span style={{ ...NUM, fontSize: 18, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

// --- KPI strip --------------------------------------------------------------

function KpiStrip({
  data,
  locale,
  tr,
}: {
  data: { covers: number; realizedRevenue: number; openBillsTotal: number; avgTurn: number };
  locale: Locale;
  tr: (k: keyof typeof UI) => string;
}) {
  const { ref, className } = useReveal();
  const tiles = [
    { label: tr("covers"), node: <span style={{ ...MONO }}>{sar(data.covers, locale)}</span> },
    {
      label: tr("revenueToday"),
      node: <Money value={data.realizedRevenue} locale={locale} />,
    },
    {
      label: tr("openBills"),
      node: <Money value={data.openBillsTotal} locale={locale} />,
    },
    {
      label: tr("avgTurn"),
      node: (
        <span style={{ ...MONO }}>
          {data.avgTurn}
          <span style={{ fontSize: "0.5em", color: NOIR.muted, marginInlineStart: 4 }}>
            {locale === "ar" ? "د" : "min"}
          </span>
        </span>
      ),
    },
  ];
  return (
    <div
      ref={ref}
      className={`qp-reveal-up qp-branch-kpis ${className}`}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 14,
      }}
    >
      {tiles.map((t, i) => (
        <div
          key={t.label}
          style={{
            ...noirCard({ pad: S[4], radius: R.lg }),
            background: NOIR.surface,
          }}
        >
          <div style={{ ...TX.eyebrow, color: NOIR.faint, fontSize: 11 }}>{t.label}</div>
          <div style={{ ...T.display, fontSize: 30, marginTop: 8, color: NOIR.text }}>{t.node}</div>
        </div>
      ))}
    </div>
  );
}

// --- Needs-attention strip --------------------------------------------------

function AttentionStrip({
  items,
  locale,
  tr,
  bl,
}: {
  items: { table: Table; elapsed: number; kind: "bill" | "long" }[];
  locale: Locale;
  tr: (k: keyof typeof UI) => string;
  bl: (p: Locale2) => string;
}) {
  if (items.length === 0) {
    return (
      <div
        style={{
          marginTop: 16,
          padding: "12px 16px",
          borderRadius: R.lg,
          border: `1px solid ${NOIR.border}`,
          background: NOIR.surface,
          color: NOIR.muted,
          fontSize: 14,
        }}
      >
        {tr("noAttention")}
      </div>
    );
  }
  return (
    <div style={{ marginTop: 16 }}>
      <SectionLabel>{tr("needsAttention")}</SectionLabel>
      <div
        className="qp-scroll-x"
        style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}
      >
        {items.map(({ table, elapsed, kind }) => {
          const accent = kind === "bill" ? "#FBBF24" : "#F87171";
          const reason =
            kind === "bill"
              ? bl(STATE_META.bill_requested.label)
              : `${tr("seatedFor")} ${elapsed} ${locale === "ar" ? "د" : "min"}`;
          return (
            <div
              key={table.id}
              style={{
                ...noirCard({ pad: S[3], radius: R.md }),
                background: NOIR.surfaceAlt,
                borderTop: `2px solid ${accent}`,
                minWidth: 200,
                flex: "0 0 auto",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  aria-hidden="true"
                  style={{ width: 8, height: 8, borderRadius: R.pill, background: accent }}
                />
                <span style={{ ...NUM, fontWeight: 700 }}>
                  {tr("table")} {table.number}
                </span>
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: NOIR.muted, lineHeight: 1.45 }}>
                {reason}
                {table.currentTotalSar ? (
                  <>
                    {" · "}
                    <Money value={table.currentTotalSar} locale={locale} />
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Floor grid -------------------------------------------------------------

function FloorGrid({
  tables,
  selectedId,
  onSelect,
  locale,
  tr,
  bl,
}: {
  tables: Table[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  locale: Locale;
  tr: (k: keyof typeof UI) => string;
  bl: (p: Locale2) => string;
}) {
  const { ref, className } = useReveal();
  return (
    <section>
      <SectionLabel>{tr("floor")}</SectionLabel>
      <div
        ref={ref}
        className={`qp-reveal-up ${className}`}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 12,
        }}
      >
        {tables.map((t, i) => {
          const meta = STATE_META[t.state];
          const selected = t.id === selectedId;
          const occupied = ["seated", "ordered", "bill_requested", "paying"].includes(t.state);
          const elapsed = t.openedAt ? elapsedMin(t.openedAt) : null;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              aria-pressed={selected}
              aria-label={`${tr("table")} ${t.number}, ${bl(meta.label)}`}
              style={{
                textAlign: "start",
                cursor: "pointer",
                background: NOIR.surface,
                color: NOIR.text,
                border: selected
                  ? `1px solid ${GLOW.brand}`
                  : `1px solid ${NOIR.border}`,
                borderRadius: R.lg,
                padding: S[3],
                minHeight: 112,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                boxShadow: selected ? `0 0 0 1px ${GLOW.brand}, 0 0 24px ${GLOW.brandSoft}` : undefined,
                transition: "border-color 200ms, box-shadow 200ms",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ ...MONO, fontSize: 22, fontWeight: 600 }}>{t.number}</span>
                <span
                  className={meta.pulse ? "qp-glow-pulse" : undefined}
                  aria-hidden="true"
                  style={{ width: 9, height: 9, borderRadius: R.pill, background: meta.accent }}
                />
              </div>
              <span
                style={{
                  alignSelf: "flex-start",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  color: meta.accent,
                  background: NOIR.surfaceAlt,
                  border: `1px solid ${NOIR.border}`,
                  borderRadius: R.pill,
                  padding: "2px 8px",
                }}
              >
                {bl(meta.label)}
              </span>
              <div
                style={{
                  marginTop: "auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: NOIR.muted,
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ ...NUM }}>
                  {t.seats} {tr("seats")}
                </span>
                {occupied && t.guests ? (
                  <span style={{ ...NUM }}>
                    {t.guests} {tr("guests")}
                  </span>
                ) : null}
              </div>
              {occupied && elapsed != null ? (
                <div style={{ fontSize: 12, color: NOIR.faint, ...NUM }}>
                  {tr("seatedFor")} {elapsed} {locale === "ar" ? "د" : "min"}
                  {t.currentTotalSar ? (
                    <>
                      {" · "}
                      <span style={{ color: NOIR.muted }}>{sar(t.currentTotalSar, locale)}</span>
                    </>
                  ) : null}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// --- Detail rail (selected table) / open tickets ----------------------------

function DetailRail({
  selected,
  locale,
  tr,
  bl,
  onClear,
}: {
  selected: Table | null;
  locale: Locale;
  tr: (k: keyof typeof UI) => string;
  bl: (p: Locale2) => string;
  onClear: () => void;
}) {
  if (!selected) {
    return <OpenTickets locale={locale} tr={tr} bl={bl} />;
  }
  const order = ORDERS.find((o) => o.tableId === selected.id);
  const meta = STATE_META[selected.state];
  const elapsed = selected.openedAt ? elapsedMin(selected.openedAt) : null;
  const lines = order
    ? order.items
        .map((li) => {
          const mi = MENU_ITEMS.find((m) => m.id === li.menuItemId);
          return mi ? { name: mi.name, price: mi.priceSar, qty: li.qty } : null;
        })
        .filter(Boolean) as { name: Locale2; price: number; qty: number }[]
    : [];
  const computedTotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const due = selected.currentTotalSar ?? computedTotal;
  const showDue = ["bill_requested", "paying"].includes(selected.state);

  return (
    <section style={{ ...noirCard({ pad: S[5], radius: R.lg }), background: NOIR.surface }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ ...MONO, fontSize: 26, fontWeight: 600 }}>{selected.number}</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: meta.accent,
            background: NOIR.surfaceAlt,
            border: `1px solid ${NOIR.border}`,
            borderRadius: R.pill,
            padding: "3px 9px",
          }}
        >
          {bl(meta.label)}
        </span>
        <button
          type="button"
          onClick={onClear}
          style={{
            ...btn("ghost"),
            background: "transparent",
            color: NOIR.muted,
            marginInlineStart: "auto",
            minHeight: 36,
            padding: "6px 10px",
          }}
        >
          {tr("backToTickets")}
        </button>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          color: NOIR.muted,
          fontSize: 13,
        }}
      >
        <span style={{ ...NUM }}>
          {selected.seats} {tr("seats")}
        </span>
        {selected.guests ? (
          <span style={{ ...NUM }}>
            {selected.guests} {tr("guests")}
          </span>
        ) : null}
        {elapsed != null ? (
          <span style={{ ...NUM }}>
            {tr("seatedFor")} {elapsed} {locale === "ar" ? "د" : "min"}
          </span>
        ) : null}
      </div>

      {lines.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          {lines.map((l, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                padding: "10px 0",
                borderBottom: `1px solid ${NOIR.border}`,
              }}
            >
              <span
                style={{
                  ...MONO,
                  color: GLOW.brand,
                  fontWeight: 700,
                  minWidth: 28,
                }}
              >
                {l.qty}×
              </span>
              <span style={{ flex: 1, fontSize: 14 }}>{bl(l.name)}</span>
              <span style={{ ...MONO, color: NOIR.muted, fontSize: 13 }}>
                {sar(l.price * l.qty, locale)}
              </span>
            </div>
          ))}

          <div
            style={{
              marginTop: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ ...TX.eyebrow, color: NOIR.faint }}>
              {showDue ? tr("amountDue") : tr("orderTotal")}
            </span>
            <Money
              value={due}
              locale={locale}
              style={{ fontSize: 24, fontWeight: 600, color: showDue ? GLOW.brand : NOIR.text }}
            />
          </div>
        </div>
      ) : (
        <p style={{ marginTop: 18, color: NOIR.muted, fontSize: 14, lineHeight: 1.6 }}>
          {tr("noOrder")}
        </p>
      )}
    </section>
  );
}

function OpenTickets({
  locale,
  tr,
  bl,
}: {
  locale: Locale;
  tr: (k: keyof typeof UI) => string;
  bl: (p: Locale2) => string;
}) {
  const tickets = ORDERS.filter((o) => o.status !== "closed");
  return (
    <section style={{ ...noirCard({ pad: S[5], radius: R.lg }), background: NOIR.surface }}>
      <SectionLabel>{tr("openTickets")}</SectionLabel>
      {tickets.length === 0 ? (
        <p style={{ color: NOIR.muted, fontSize: 14 }}>{tr("selectHint")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
          {tickets.map((o) => {
            const t = TABLES.find((x) => x.id === o.tableId);
            const elapsed = elapsedMin(o.openedAt);
            const count = o.items.reduce((s, li) => s + li.qty, 0);
            return (
              <div
                key={o.id}
                style={{
                  border: `1px solid ${NOIR.border}`,
                  borderRadius: R.md,
                  padding: S[3],
                  background: NOIR.surfaceAlt,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ ...NUM, fontWeight: 700 }}>
                    {tr("table")} {t?.number ?? "?"}
                  </span>
                  <span style={{ ...NUM, fontSize: 12, color: NOIR.muted }}>
                    {tr("seatedFor")} {elapsed} {locale === "ar" ? "د" : "min"}
                  </span>
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color: NOIR.muted }}>
                  {bl(STATE_META.ordered.label)} · {count} {locale === "ar" ? "صنف" : "items"}
                  {t?.currentTotalSar ? (
                    <>
                      {" · "}
                      <Money value={t.currentTotalSar} locale={locale} />
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p style={{ marginTop: 14, color: NOIR.faint, fontSize: 12.5, lineHeight: 1.5 }}>
        {tr("selectHint")}
      </p>
    </section>
  );
}

// --- Staff on shift ---------------------------------------------------------

function StaffSection({
  branchId,
  locale,
  tr,
  bl,
}: {
  branchId: string;
  locale: Locale;
  tr: (k: keyof typeof UI) => string;
  bl: (p: Locale2) => string;
}) {
  const staff = STAFF.filter((s) => s.branchId === branchId && s.status === "active");
  const { ref, className } = useReveal();
  return (
    <section style={{ marginTop: 40 }}>
      <SectionLabel>{tr("staffOnShift")}</SectionLabel>
      <div
        ref={ref}
        className={`qp-reveal-up ${className}`}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 12,
          marginTop: 4,
        }}
      >
        {staff.map((s) => (
          <div
            key={s.id}
            style={{
              ...noirCard({ pad: S[3], radius: R.md }),
              background: NOIR.surface,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 36,
                height: 36,
                borderRadius: R.pill,
                background: NOIR.surfaceAlt,
                border: `1px solid ${NOIR.border}`,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: GLOW.brand,
                fontWeight: 700,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {bl(s.name).slice(0, 1)}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {bl(s.name)}
              </div>
              <div style={{ fontSize: 12.5, color: NOIR.muted }}>{bl(ROLE_LABEL[s.role])}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// --- End of day -------------------------------------------------------------

function EodSection({
  data,
  locale,
  tr,
  bl,
}: {
  data: {
    realizedRevenue: number;
    realizedTips: number;
    todaysTxns: { amountSar: number; tipSar: number }[];
    mix: { method: string; amount: number }[];
    deltaPct: number;
    covers: number;
  };
  locale: Locale;
  tr: (k: keyof typeof UI) => string;
  bl: (p: Locale2) => string;
}) {
  const { ref, className } = useReveal();
  const tipRate = data.realizedRevenue > 0
    ? Math.round((data.realizedTips / data.realizedRevenue) * 1000) / 10
    : 0;
  const mixTotal = data.mix.reduce((s, m) => s + m.amount, 0) || 1;

  const summary = [
    { label: tr("totalRevenue"), node: <Money value={data.realizedRevenue} locale={locale} style={{ fontSize: 22 }} /> },
    { label: tr("totalTips"), node: <Money value={data.realizedTips} locale={locale} style={{ fontSize: 22 }} /> },
    {
      label: tr("transactions"),
      node: (
        <span style={{ ...MONO, fontSize: 22, fontWeight: 600 }}>{data.todaysTxns.length}</span>
      ),
    },
    {
      label: tr("tipRate"),
      node: (
        <span style={{ ...MONO, fontSize: 22, fontWeight: 600 }}>
          <span style={numIsolate}>{tipRate}%</span>
        </span>
      ),
    },
  ];

  return (
    <section style={{ marginTop: 40 }}>
      <SectionLabel>{tr("endOfDay")}</SectionLabel>
      <div
        ref={ref}
        className={`qp-reveal-up qp-branch-eod ${className}`}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginTop: 4,
        }}
      >
        {summary.map((s) => (
          <div key={s.label} style={{ ...noirCard({ pad: S[4], radius: R.lg }), background: NOIR.surface }}>
            <div style={{ ...TX.eyebrow, color: NOIR.faint, fontSize: 11 }}>{s.label}</div>
            <div style={{ marginTop: 8, color: NOIR.text }}>{s.node}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 14,
        }}
        className="qp-branch-eodmix"
      >
        <div style={{ ...noirCard({ pad: S[5], radius: R.lg }), background: NOIR.surface }}>
          <div style={{ ...TX.eyebrow, color: NOIR.faint, fontSize: 11 }}>{tr("paymentMix")}</div>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            {data.mix.map((m) => {
              const pct = Math.round((m.amount / mixTotal) * 100);
              return (
                <div key={m.method}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      marginBottom: 6,
                    }}
                  >
                    <span>{bl(PAYMENT_LABEL[m.method] ?? { ar: m.method, en: m.method })}</span>
                    <span style={{ ...MONO, color: NOIR.muted }}>
                      {pct}% · {sar(m.amount, locale)} {currencySuffix(locale)}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: R.pill,
                      background: NOIR.surfaceAlt,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: GLOW.brand,
                        borderRadius: R.pill,
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {data.mix.length === 0 ? (
              <p style={{ color: NOIR.muted, fontSize: 13 }}>
                {locale === "ar" ? "لا توجد عمليات بعد." : "No transactions yet."}
              </p>
            ) : null}
          </div>
        </div>

        <div style={{ ...noirCard({ pad: S[5], radius: R.lg }), background: NOIR.surface }}>
          <div style={{ ...TX.eyebrow, color: NOIR.faint, fontSize: 11 }}>{tr("vsYesterday")}</div>
          <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ ...numIsolate, fontSize: 30, fontWeight: 600, color: GLOW.brand }}>
              {data.deltaPct >= 0 ? "+" : ""}
              {data.deltaPct}%
            </span>
          </div>
          <p style={{ marginTop: 8, color: NOIR.muted, fontSize: 13, lineHeight: 1.55 }}>
            {locale === "ar"
              ? "نمو الإيراد مقارنة بيوم أمس، وفق بيانات آخر أسبوعين."
              : "Revenue growth vs yesterday, from the last two weeks of data."}
          </p>
        </div>
      </div>
    </section>
  );
}

// --- shared bits ------------------------------------------------------------

const numIsolate: CSSProperties = {
  display: "inline-block",
  direction: "ltr",
  unicodeBidi: "isolate",
};

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        ...TX.eyebrow,
        color: NOIR.muted,
        fontSize: 12,
        margin: "0 0 12px",
      }}
    >
      {children}
    </h2>
  );
}
