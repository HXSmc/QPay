"use client";

// /demo/admin: NO-AUTH polished showcase of the multi-branch operator
// dashboard, built entirely from app/demo/_data.ts mock content. Light surface
// (C.* tokens, matches the real /admin routes) with one Noir KPI strip up top
// per app/demo/DIRECTION.md §10.3. Arabic-first RTL default with an EN toggle.
// Nothing here is production: no fetch, no Supabase, no auth.

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  C,
  R,
  S,
  T,
  NUM,
  MONO,
  STATUS,
  SHADOW,
  NOIR,
  GLOW,
  MOTION,
  badge,
  card,
  btn,
} from "../../lib/theme";
import { usePrefersReducedMotion } from "../../lib/use-reduced-motion";
import { useReveal, staggerDelay } from "../immersive";
import {
  RESTAURANT,
  BRANCHES,
  TABLES,
  MENU_ITEMS,
  ORDERS,
  ANALYTICS_DHAHRAN,
  BRANCH_SUMMARIES,
  STAFF,
  type Bilingual,
  type TableState,
  type Order,
  type MenuItem,
  type StaffMember,
} from "../_data";

// ---------------------------------------------------------------------------
// Locale + UI chrome dictionary
// ---------------------------------------------------------------------------

type Locale = "ar" | "en";

const UI = {
  demoBadge: { en: "Demo", ar: "نسخة تجريبية" },
  allBranches: { en: "All branches", ar: "كل الفروع" },
  restaurantGroup: { en: "Restaurant group", ar: "مجموعة المطاعم" },
  // sidebar
  manage: { en: "Manage", ar: "الإدارة" },
  navDashboard: { en: "Dashboard", ar: "لوحة التحكم" },
  navTables: { en: "Tables & QR", ar: "الطاولات و QR" },
  navBranches: { en: "Branches", ar: "الفروع" },
  navOrders: { en: "Orders", ar: "الطلبات" },
  navTransactions: { en: "Transactions", ar: "المعاملات" },
  navMenu: { en: "Menu", ar: "القائمة" },
  navAnalytics: { en: "Analytics", ar: "التحليلات" },
  navTeam: { en: "Team", ar: "الفريق" },
  // kpi
  kpiRevenue: { en: "Revenue", ar: "الإيرادات" },
  kpiRevenueSub: { en: "Month to date", ar: "من بداية الشهر" },
  kpiTip: { en: "Avg tip", ar: "متوسط الإكرامية" },
  kpiTurns: { en: "Table turns", ar: "دورات الطاولة" },
  kpiTurnsSub: { en: "Today, per table", ar: "اليوم، لكل طاولة" },
  kpiActive: { en: "Active tables", ar: "طاولات نشطة" },
  kpiActiveSub: { en: "Seated or in flow", ar: "مشغولة الآن" },
  kpiNoData: { en: "No live mock data", ar: "لا توجد بيانات حية" },
  today: { en: "Today", ar: "اليوم" },
  pilot: { en: "pilot branch", ar: "الفرع التجريبي" },
  // sections
  revenueTrend: { en: "Revenue trend", ar: "اتجاه الإيرادات" },
  last7: { en: "Last 7 days", ar: "آخر ٧ أيام" },
  revenueSeries: { en: "Revenue (SAR)", ar: "الإيرادات (ر.س)" },
  floor: { en: "Floor", ar: "الصالة" },
  floorSub: { en: "Live table occupancy", ar: "حالة الطاولات مباشرة" },
  liveOrders: { en: "Live orders", ar: "الطلبات الحية" },
  topSellers: { en: "Top sellers", ar: "الأكثر مبيعًا" },
  topSellersSub: { en: "By quantity sold", ar: "حسب الكمية المباعة" },
  branchCompare: { en: "Branch comparison", ar: "مقارنة الفروع" },
  team: { en: "Team", ar: "الفريق" },
  // table columns / cells
  colBranch: { en: "Branch", ar: "الفرع" },
  colCity: { en: "City", ar: "المدينة" },
  colTier: { en: "Tier", ar: "الباقة" },
  colTables: { en: "Tables", ar: "الطاولات" },
  colRevenue: { en: "Revenue", ar: "الإيرادات" },
  colTurns: { en: "Turns", ar: "الدورات" },
  colTip: { en: "Avg tip", ar: "الإكرامية" },
  colTable: { en: "Table", ar: "طاولة" },
  colGuests: { en: "Guests", ar: "ضيوف" },
  colItems: { en: "Items", ar: "أصناف" },
  colTotal: { en: "Total", ar: "الإجمالي" },
  colStatus: { en: "Status", ar: "الحالة" },
  colRank: { en: "Rank", ar: "الترتيب" },
  colItem: { en: "Item", ar: "الصنف" },
  colQty: { en: "Qty", ar: "الكمية" },
  // order status
  stOpen: { en: "Open", ar: "مفتوحة" },
  stSent: { en: "Sent", ar: "أُرسلت" },
  stPreparing: { en: "Preparing", ar: "قيد التحضير" },
  stServed: { en: "Served", ar: "مُقدّمة" },
  stClosed: { en: "Closed", ar: "مغلقة" },
  // floor states
  flAvailable: { en: "Free", ar: "متاحة" },
  flSeated: { en: "Seated", ar: "جلوس" },
  flOrdered: { en: "Ordering", ar: "تطلب" },
  flBill: { en: "Bill", ar: "الفاتورة" },
  flPaying: { en: "Paying", ar: "تدفع" },
  flPaid: { en: "Paid", ar: "مدفوعة" },
  flCleaning: { en: "Cleaning", ar: "تنظيف" },
  // staff
  roleOwner: { en: "Owner", ar: "المالك" },
  roleManager: { en: "Branch manager", ar: "مدير الفرع" },
  roleServer: { en: "Server", ar: "نادل" },
  roleCashier: { en: "Cashier", ar: "أمين صندوق" },
  stActive: { en: "Active", ar: "نشط" },
  stInvited: { en: "Invited", ar: "مدعو" },
  hq: { en: "Group HQ", ar: "إدارة المجموعة" },
  // misc
  emptyFloor: { en: "No live table data for this branch yet.", ar: "لا توجد بيانات طاولات حية لهذا الفرع بعد." },
  emptyOrders: { en: "No open orders at this branch right now.", ar: "لا توجد طلبات مفتوحة في هذا الفرع الآن." },
  emptySellers: { en: "No sales recorded yet.", ar: "لا توجد مبيعات مسجلة بعد." },
  langToggle: { en: "EN", ar: "ع" },
  seats: { en: "seats", ar: "مقاعد" },
  guestsUnit: { en: "guests", ar: "ضيف" },
  ago: { en: "ago", ar: "منذ" },
} as const satisfies Record<string, Bilingual>;

const tr = (locale: Locale, key: keyof typeof UI) =>
  locale === "ar" ? UI[key].ar : UI[key].en;

const bi = (locale: Locale, b: Bilingual) => (locale === "ar" ? b.ar : b.en);

// Latin-digit grouping for every figure (numbers stay LTR inside RTL flow via MONO).
const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");
const fmtDec = (n: number, d = 1) =>
  n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

// ---------------------------------------------------------------------------
// Floor state → color + label
// ---------------------------------------------------------------------------

type FloorInfo = {
  labelKey: keyof typeof UI;
  kind: keyof typeof STATUS; // STATUS-based palette on the light surface
  live?: boolean; // earns the glow pulse (one per floor)
  dim?: boolean;
};

const FLOOR: Record<TableState, FloorInfo> = {
  available: { labelKey: "flAvailable", kind: "neutral" },
  seated: { labelKey: "flSeated", kind: "info" },
  ordered: { labelKey: "flOrdered", kind: "warn" },
  bill_requested: { labelKey: "flBill", kind: "warn", live: true },
  paying: { labelKey: "flPaying", kind: "info" },
  paid: { labelKey: "flPaid", kind: "success" },
  cleaning: { labelKey: "flCleaning", kind: "neutral", dim: true },
};

const ORDER_STATUS: Record<Order["status"], { labelKey: keyof typeof UI; kind: keyof typeof STATUS }> = {
  open: { labelKey: "stOpen", kind: "neutral" },
  sent: { labelKey: "stSent", kind: "info" },
  preparing: { labelKey: "stPreparing", kind: "warn" },
  served: { labelKey: "stServed", kind: "success" },
  closed: { labelKey: "stClosed", kind: "neutral" },
};

const ROLE_LABEL: Record<StaffMember["role"], keyof typeof UI> = {
  owner: "roleOwner",
  branch_manager: "roleManager",
  server: "roleServer",
  cashier: "roleCashier",
};

const OCCUPIED: TableState[] = ["seated", "ordered", "bill_requested", "paying", "paid"];

// ---------------------------------------------------------------------------
// Count-up: observes its own node, animates on intersect, snaps under
// prefers-reduced-motion. The parent remounts the tile (via key) on branch
// change so the figure re-counts instead of snapping to the new number.
// ---------------------------------------------------------------------------

function useCountUp(target: number, duration = 1100) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLSpanElement | null>(null);
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (reduced) {
      setVal(target);
      return;
    }
    const node = ref.current;
    if (!node) return;
    let raf = 0;
    const run = () => {
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setVal(target * eased);
        if (p < 1) raf = requestAnimationFrame(step);
        else setVal(target);
      };
      raf = requestAnimationFrame(step);
    };
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          run();
          obs.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(node);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [reduced, target, duration]);

  return { ref, val };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DemoAdminPage() {
  const [locale, setLocale] = useState<Locale>("ar");
  const [branchId, setBranchId] = useState<string>("br_dhahran"); // pilot default
  const [now, setNow] = useState<Date | null>(null);

  // Drive html lang/dir so the Arabic font swap and [dir="rtl"] reveal/marquee
  // selectors fire. The wrapper div also carries dir for immediate mirroring.
  useEffect(() => {
    const el = document.documentElement;
    el.lang = locale;
    el.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const dir = locale === "ar" ? "rtl" : "ltr";

  // Scope mock data to the selected branch ("all" = group aggregate view).
  const scope = useMemo(() => {
    const filter = branchId === "all" ? null : branchId;
    const tables = TABLES.filter((t) => !filter || t.branchId === filter);
    const orders = ORDERS.filter((o) => !filter || o.branchId === filter);
    const summaries = BRANCH_SUMMARIES.filter((s) => !filter || s.branchId === filter);
    return { tables, orders, summaries };
  }, [branchId]);

  const kpi = useMemo(() => {
    const sums = scope.summaries;
    const revenueMtd = sums.reduce((a, s) => a + s.revenueMtdSar, 0);
    const avgTip = sums.length ? sums.reduce((a, s) => a + s.avgTipPct, 0) / sums.length : 0;
    const turns = sums.length ? sums.reduce((a, s) => a + s.tableTurnsToday, 0) / sums.length : 0;
    const activeTables = scope.tables.filter((t) => OCCUPIED.includes(t.state)).length;
    return { revenueMtd, avgTip, turns, activeTables };
  }, [scope]);

  // Pilot "today" snapshot (only Dhahran carries daily analytics in the mock).
  const pilotToday = ANALYTICS_DHAHRAN[ANALYTICS_DHAHRAN.length - 1];
  const series7 = ANALYTICS_DHAHRAN.slice(-7);

  const menuById = useMemo(() => {
    const m = new Map<string, MenuItem>();
    MENU_ITEMS.forEach((mi) => m.set(mi.id, mi));
    return m;
  }, []);

  const orderTotal = (o: Order) =>
    o.items.reduce((a, li) => a + (menuById.get(li.menuItemId)?.priceSar ?? 0) * li.qty, 0);

  const sellers = useMemo(() => {
    const qty = new Map<string, number>();
    scope.orders.forEach((o) => o.items.forEach((li) => qty.set(li.menuItemId, (qty.get(li.menuItemId) ?? 0) + li.qty)));
    return [...qty.entries()]
      .map(([id, q]) => ({ item: menuById.get(id), qty: q }))
      .filter((r): r is { item: MenuItem; qty: number } => Boolean(r.item))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [scope, menuById]);

  const openOrders = useMemo(
    () => scope.orders.filter((o) => o.status !== "closed"),
    [scope],
  );

  const t = (k: keyof typeof UI) => tr(locale, k);

  return (
    <div
      className="qp-admin-shell"
      dir={dir}
      style={{
        display: "flex",
        background: C.canvas,
        color: C.text,
        minHeight: "100vh",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <DemoSidebar locale={locale} active="navDashboard" />

      <main style={{ flex: 1, minWidth: 0 }}>
        {/* Top bar */}
        <TopBar
          locale={locale}
          dir={dir}
          onToggleLocale={() => setLocale((p) => (p === "ar" ? "en" : "ar"))}
          branchId={branchId}
          onBranch={setBranchId}
        />

        <div style={{ padding: `${S[5]}px ${S[6]}px ${S[7]}px`, maxWidth: 1320 }}>
          <KpiStrip
            locale={locale}
            scopeKey={branchId}
            kpi={kpi}
            pilotToday={pilotToday}
            series7={series7}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.55fr) minmax(0, 1fr)",
              gap: S[5],
              marginTop: S[5],
            }}
            className="qp-admin-2col"
          >
            <SectionCard locale={locale} title={t("revenueTrend")} sub={t("last7")}>
              <RevenueChart locale={locale} series={series7} />
            </SectionCard>

            <SectionCard locale={locale} title={t("floor")} sub={t("floorSub")}>
              <FloorGrid locale={locale} tables={scope.tables} />
            </SectionCard>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)",
              gap: S[5],
              marginTop: S[5],
            }}
            className="qp-admin-3col"
          >
            <SectionCard locale={locale} title={t("liveOrders")} sub={undefined}>
              <OrdersFeed locale={locale} orders={openOrders} menuById={menuById} total={orderTotal} now={now} />
            </SectionCard>

            <SectionCard locale={locale} title={t("topSellers")} sub={t("topSellersSub")}>
              <TopSellers locale={locale} rows={sellers} />
            </SectionCard>

            <SectionCard locale={locale} title={t("team")} sub={undefined}>
              <TeamPanel locale={locale} branchId={branchId} />
            </SectionCard>
          </div>

          <div style={{ marginTop: S[5] }}>
            <SectionCard locale={locale} title={t("branchCompare")} sub={undefined}>
              <BranchTable locale={locale} selected={branchId} />
            </SectionCard>
          </div>
        </div>
      </main>

      {/* Responsive column collapses for the bento grids below 1100/820px. */}
      <style>{`
        @media (max-width: 1100px) {
          .qp-admin-3col { grid-template-columns: 1fr 1fr !important; }
          .qp-kpi { grid-template-columns: repeat(2, minmax(0,1fr)) minmax(180px,1fr) !important; }
          .qp-kpi-spark { grid-column: 1 / -1 !important; }
        }
        @media (max-width: 900px) {
          .qp-admin-2col { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 760px) {
          .qp-admin-3col { grid-template-columns: 1fr !important; }
          .qp-kpi { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ===========================================================================
// Sidebar (visual chrome matching the production /admin sidebar conventions,
// qp-admin-shell / qp-sidebar classes drive the mobile collapse in globals.css)
// ===========================================================================

function DemoSidebar({
  locale,
  active,
}: {
  locale: Locale;
  active: keyof typeof UI;
}) {
  const t = (k: keyof typeof UI) => tr(locale, k);
  const items: { key: keyof typeof UI; href: string }[] = [
    { key: "navDashboard", href: "#top" },
    { key: "navTables", href: "#top" },
    { key: "navBranches", href: "#branches" },
    { key: "navOrders", href: "#top" },
    { key: "navTransactions", href: "#top" },
    { key: "navMenu", href: "#top" },
    { key: "navAnalytics", href: "#top" },
    { key: "navTeam", href: "#top" },
  ];
  return (
    <div
      className="qp-sidebar"
      style={{
        width: 244,
        flexShrink: 0,
        background: C.ink,
        color: "#fff",
        padding: `${S[5]}px ${S[3]}px ${S[4]}px`,
        display: "flex",
        flexDirection: "column",
        gap: S[2],
        minHeight: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: S[2] + 2,
          padding: `0 ${S[2]}px ${S[4]}px`,
        }}
      >
        <ReceiptMark />
        <span style={{ ...T.h2, fontWeight: 700, color: "#fff" }}>Nuqra</span>
      </div>
      <div
        className="qp-hide-mobile"
        style={{
          ...T.caption,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: C.faint,
          padding: `0 ${S[3]}px ${S[1]}px`,
        }}
      >
        {t("manage")}
      </div>
      <nav aria-label={t("manage")} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((it) => {
          const on = it.key === active;
          return (
            <a
              key={it.key}
              href={it.href}
              aria-current={on ? "page" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: S[3] - 1,
                padding: `${S[2] + 1}px ${S[3]}px`,
                borderRadius: R.md,
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                textDecoration: "none",
                background: on ? C.brand : "transparent",
                color: on ? "#fff" : C.faint,
                boxShadow: on ? SHADOW.cta : undefined,
                minHeight: 40,
              }}
            >
              {t(it.key)}
            </a>
          );
        })}
      </nav>
    </div>
  );
}

/** Simplified receipt-N mark in pure SVG (matches app/icon.svg geometry idea). */
function ReceiptMark() {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M5 3h14v18l-3-2-3 2-3-2-3 2-2-1.3V3z"
        fill={C.brand}
        opacity={0.9}
      />
      <path d="M8 8h8M8 12h8M8 16h5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// ===========================================================================
// Top bar: identity, branch switcher, locale toggle
// ===========================================================================

function TopBar({
  locale,
  dir,
  onToggleLocale,
  branchId,
  onBranch,
}: {
  locale: Locale;
  dir: "rtl" | "ltr";
  onToggleLocale: () => void;
  branchId: string;
  onBranch: (id: string) => void;
}) {
  const t = (k: keyof typeof UI) => tr(locale, k);
  const branch = BRANCHES.find((b) => b.id === branchId);
  return (
    <header
      id="top"
      style={{
        display: "flex",
        alignItems: "center",
        gap: S[4],
        padding: `${S[4]}px ${S[6]}px`,
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: S[2] }}>
          <h1 style={{ ...T.h2, margin: 0 }}>{bi(locale, RESTAURANT.name)}</h1>
          <span
            style={{
              ...badge("neutral"),
              textTransform: "uppercase",
              color: C.brand,
              background: C.brandTint,
              borderColor: "transparent",
            }}
          >
            {t("demoBadge")}
          </span>
        </div>
        <div style={{ ...T.caption, color: C.muted, marginTop: 2 }}>
          {branch ? `${bi(locale, branch.name)} · ${bi(locale, branch.city)}` : t("restaurantGroup")}
        </div>
      </div>

      <div style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: S[2] }}>
        <BranchSwitcher locale={locale} value={branchId} onChange={onBranch} />
        <button
          type="button"
          onClick={onToggleLocale}
          aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
          className="qp-press"
          style={{
            ...btn("secondary"),
            minWidth: 44,
            minHeight: 44,
            padding: "10px 14px",
          }}
          data-dir={dir}
        >
          {t("langToggle")}
        </button>
      </div>
    </header>
  );
}

function BranchSwitcher({
  locale,
  value,
  onChange,
}: {
  locale: Locale;
  value: string;
  onChange: (id: string) => void;
}) {
  const t = (k: keyof typeof UI) => tr(locale, k);
  const options = [{ id: "all", label: t("allBranches") }, ...BRANCHES.map((b) => ({ id: b.id, label: bi(locale, b.city) }))];
  return (
    <div
      role="group"
      aria-label={t("navBranches")}
      style={{
        display: "inline-flex",
        background: C.surfaceAlt,
        border: `1px solid ${C.border}`,
        borderRadius: R.md,
        padding: 3,
        gap: 2,
        maxWidth: "100%",
        overflowX: "auto",
      }}
    >
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={on}
            style={{
              border: "none",
              background: on ? C.surface : "transparent",
              color: on ? C.text : C.muted,
              fontWeight: 600,
              fontSize: 13,
              padding: "8px 14px",
              borderRadius: R.sm,
              cursor: "pointer",
              minHeight: 36,
              whiteSpace: "nowrap",
              boxShadow: on ? SHADOW.e1 : undefined,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ===========================================================================
// KPI strip: the one Noir band on this page
// ===========================================================================

function KpiStrip({
  locale,
  scopeKey,
  kpi,
  pilotToday,
  series7,
}: {
  locale: Locale;
  scopeKey: string;
  kpi: { revenueMtd: number; avgTip: number; turns: number; activeTables: number };
  pilotToday: { revenueSar: number; orders: number; avgTicketSar: number };
  series7: { date: string; revenueSar: number }[];
}) {
  const t = (k: keyof typeof UI) => tr(locale, k);
  const reveal = useReveal<HTMLElement>();
  const min = Math.min(...series7.map((p) => p.revenueSar));
  const max = Math.max(...series7.map((p) => p.revenueSar));

  return (
    <section
      ref={reveal.ref}
      className={`qp-reveal-up qp-kpi ${reveal.className}`}
      style={{
        background: NOIR.canvas,
        color: NOIR.text,
        borderRadius: R.lg,
        padding: S[5],
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0,1fr)) minmax(180px, 1.1fr)",
        gap: S[4],
        alignItems: "stretch",
      }}
    >
      <KpiTile
        key={`rev-${scopeKey}`}
        locale={locale}
        label={t("kpiRevenue")}
        sub={t("kpiRevenueSub")}
        target={kpi.revenueMtd}
        format={(n) => fmtInt(n)}
        suffix="SAR"
        accent
      />
      <KpiTile
        key={`tip-${scopeKey}`}
        locale={locale}
        label={t("kpiTip")}
        sub={null}
        target={kpi.avgTip}
        format={(n) => fmtDec(n, 1)}
        suffix="%"
      />
      <KpiTile
        key={`turns-${scopeKey}`}
        locale={locale}
        label={t("kpiTurns")}
        sub={t("kpiTurnsSub")}
        target={kpi.turns}
        format={(n) => fmtDec(n, 1)}
      />
      <KpiTile
        key={`active-${scopeKey}`}
        locale={locale}
        label={t("kpiActive")}
        sub={scopeKey !== "all" && kpi.activeTables === 0 ? t("kpiNoData") : t("kpiActiveSub")}
        target={kpi.activeTables}
        format={(n) => fmtInt(n)}
      />

      {/* Pilot today + sparkline */}
      <div className="qp-kpi-spark" style={{ display: "flex", flexDirection: "column", gap: S[2], minWidth: 0 }}>
        <div style={{ ...T.caption, color: NOIR.faint, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {t("today")} · {t("pilot")}
        </div>
        <Sparkline series={series7.map((p) => p.revenueSar)} min={min} max={max} />
        <div style={{ display: "flex", gap: S[4], flexWrap: "wrap" }}>
          <PilotStat figure={fmtInt(pilotToday.revenueSar)} unit="SAR" />
          <PilotStat figure={fmtInt(pilotToday.orders)} unit="" />
          <PilotStat figure={fmtDec(pilotToday.avgTicketSar, 1)} unit="SAR" />
        </div>
      </div>
    </section>
  );
}

function KpiTile({
  locale: _locale,
  label,
  sub,
  target,
  format,
  suffix,
  accent,
}: {
  locale: Locale;
  label: string;
  sub: string | null;
  target: number;
  format: (n: number) => string;
  suffix?: string;
  accent?: boolean;
}) {
  const { ref, val } = useCountUp(target);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <div style={{ ...T.caption, color: NOIR.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
        <span
          ref={ref}
          className="qp-count"
          style={{
            ...MONO,
            color: accent ? GLOW.brand : NOIR.text,
            fontSize: "clamp(28px, 3vw, 40px)",
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          {format(val)}
        </span>
        {suffix ? (
          <span style={{ ...T.label, color: NOIR.faint, fontSize: 13, textTransform: "none", letterSpacing: 0 }}>
            {suffix}
          </span>
        ) : null}
      </div>
      {sub ? <div style={{ ...T.caption, color: NOIR.faint }}>{sub}</div> : null}
    </div>
  );
}

function PilotStat({ figure, unit }: { figure: string; unit: string }) {
  return (
    <div>
      <span className="qp-count" style={{ ...MONO, color: NOIR.text, fontSize: 16, fontWeight: 600 }}>
        {figure}
      </span>
      {unit ? <span style={{ ...T.caption, color: NOIR.faint, marginInlineStart: 3 }}>{unit}</span> : null}
    </div>
  );
}

function Sparkline({ series, min, max }: { series: number[]; min: number; max: number }) {
  const W = 200;
  const H = 48;
  const pad = 4;
  const span = Math.max(1, max - min);
  const pts = series.map((v, i) => {
    const x = pad + (i * (W - pad * 2)) / (series.length - 1);
    const y = pad + (H - pad * 2) * (1 - (v - min) / span);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} aria-hidden="true" focusable="false" preserveAspectRatio="none">
      <defs>
        <linearGradient id="qp-spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GLOW.brand} stopOpacity={0.32} />
          <stop offset="100%" stopColor={GLOW.brand} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#qp-spark)" />
      <path d={line} fill="none" stroke={GLOW.brand} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ===========================================================================
// Section card wrapper (light surface)
// ===========================================================================

function SectionCard({
  locale: _locale,
  title,
  sub,
  children,
}: {
  locale: Locale;
  title: string;
  sub?: string | null;
  children: React.ReactNode;
}) {
  const reveal = useReveal<HTMLDivElement>();
  return (
    <section
      ref={reveal.ref}
      className={`qp-reveal-up ${reveal.className}`}
      style={{ ...card({ pad: S[5] }), height: "100%" }}
    >
      <header style={{ marginBottom: S[4] }}>
        <h2 style={{ ...T.h3, margin: 0 }}>{title}</h2>
        {sub ? <div style={{ ...T.caption, color: C.muted, marginTop: 2 }}>{sub}</div> : null}
      </header>
      {children}
    </section>
  );
}

// ===========================================================================
// Revenue chart (inline SVG area + line, hover tooltip, accessible label)
// ===========================================================================

function RevenueChart({
  locale,
  series,
}: {
  locale: Locale;
  series: { date: string; revenueSar: number; orders: number }[];
}) {
  const t = (k: keyof typeof UI) => tr(locale, k);
  const reduced = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const W = 720;
  const H = 240;
  const padL = 52;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const vals = series.map((p) => p.revenueSar);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const top = max + (max - min) * 0.12;
  const bottom = Math.max(0, min - (max - min) * 0.12);
  const span = Math.max(1, top - bottom);

  const x = (i: number) => padL + (i * plotW) / (series.length - 1);
  const y = (v: number) => padT + plotH * (1 - (v - bottom) / span);

  const pts = series.map((p, i) => [x(i), y(p.revenueSar)] as const);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${x(series.length - 1).toFixed(1)},${(padT + plotH).toFixed(1)} L${x(0).toFixed(1)},${(padT + plotH).toFixed(1)} Z`;

  // 3 y gridlines
  const gridVals = [bottom, (bottom + top) / 2, top];

  const onMove = (e: React.MouseEvent) => {
    const node = containerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    const idx = Math.min(series.length - 1, Math.max(0, Math.round(frac * (series.length - 1))));
    setHover(idx);
  };

  const fmtDay = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    const weekday = d.toLocaleDateString(locale === "ar" ? "ar" : "en-US", { weekday: "short" });
    const day = d.getDate().toLocaleString("en-US");
    return `${weekday} ${day}`;
  };

  const summary = `${t("revenueTrend")}, ${t("last7").toLowerCase()}. ${t("colRevenue")} ${fmtInt(min)} ${locale === "ar" ? "إلى" : "to"} ${fmtInt(max)} SAR.`;

  const pathStyle: CSSProperties = reduced
    ? {}
    : {
        strokeDasharray: 1400,
        strokeDashoffset: 1400,
        animation: `qp-chart-draw ${MOTION.slow} ${MOTION.ease} forwards`,
      };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: S[2], marginBottom: S[3] }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: C.brand, display: "inline-block" }} aria-hidden="true" />
        <span style={{ ...T.caption, color: C.muted }}>{t("revenueSeries")}</span>
      </div>

      <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height="auto"
          role="img"
          aria-label={summary}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          <title>{summary}</title>
          <defs>
            <linearGradient id="qp-rev-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.brand} stopOpacity={0.18} />
              <stop offset="100%" stopColor={C.brand} stopOpacity={0} />
            </linearGradient>
            <style>{reduced ? "" : `@keyframes qp-chart-draw { to { stroke-dashoffset: 0; } }`}</style>
          </defs>

          {gridVals.map((gv, i) => (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={y(gv)} y2={y(gv)} stroke={C.border} strokeWidth={1} />
              <text
                x={padL - 8}
                y={y(gv) + 4}
                textAnchor="end"
                fontSize={11}
                fill={C.faint}
                style={{ ...NUM }}
              >
                {fmtInt(gv)}
              </text>
            </g>
          ))}

          <path d={area} fill="url(#qp-rev-area)" />
          <path
            d={line}
            fill="none"
            stroke={C.brand}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={pathStyle}
          />

          {pts.map((p, i) => (
            <circle
              key={i}
              cx={p[0]}
              cy={p[1]}
              r={hover === i ? 5 : 3}
              fill={C.surface}
              stroke={C.brand}
              strokeWidth={2}
            />
          ))}

          {series.map((p, i) => (
            <text
              key={p.date}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize={11}
              fill={C.muted}
            >
              {fmtDay(p.date)}
            </text>
          ))}

          {hover !== null ? (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={padT}
              y2={padT + plotH}
              stroke={C.borderStrong}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          ) : null}
        </svg>

        {hover !== null ? (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: `${(x(hover) / W) * 100}%`,
              transform: "translateX(-50%)",
              pointerEvents: "none",
              background: C.ink,
              color: "#fff",
              borderRadius: R.sm,
              padding: "6px 10px",
              boxShadow: SHADOW.e2,
              whiteSpace: "nowrap",
              textAlign: "center",
            }}
          >
            <div style={{ ...T.caption, color: C.faint }}>{fmtDay(series[hover].date)}</div>
            <div style={{ ...MONO, fontSize: 13, fontWeight: 600 }}>
              {fmtInt(series[hover].revenueSar)} <span style={{ color: C.faint, fontFamily: "inherit", letterSpacing: 0 }}>SAR</span>
            </div>
            <div style={{ ...T.caption, color: C.faint }}>
              {fmtInt(series[hover].orders)} {t("navOrders").toLowerCase()}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ===========================================================================
// Floor occupancy grid
// ===========================================================================

function FloorGrid({
  locale,
  tables,
}: {
  locale: Locale;
  tables: { id: string; number: number; seats: number; state: TableState; guests?: number; currentTotalSar?: number }[];
}) {
  const t = (k: keyof typeof UI) => tr(locale, k);

  if (tables.length === 0) {
    return <EmptyNote locale={locale} textKey="emptyFloor" />;
  }

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
          gap: S[2],
        }}
      >
        {tables.map((tb, i) => (
          <FloorTile key={tb.id} locale={locale} tb={tb} i={i} t={t} />
        ))}
      </div>
      <FloorLegend locale={locale} />
    </>
  );
}

/** One tile = its own reveal observer, so the grid staggers in cleanly. */
function FloorTile({
  locale,
  tb,
  i,
  t,
}: {
  locale: Locale;
  tb: { number: number; seats: number; state: TableState; currentTotalSar?: number };
  i: number;
  t: (k: keyof typeof UI) => string;
}) {
  const reveal = useReveal<HTMLDivElement>();
  const info = FLOOR[tb.state];
  const s = STATUS[info.kind];
  const on = OCCUPIED.includes(tb.state);
  return (
    <div
      ref={reveal.ref}
      className={`qp-reveal-scale ${reveal.className} ${staggerDelay(i)}`}
      style={{
        background: on ? s.bg : C.surfaceAlt,
        border: `1px solid ${on ? s.border : C.border}`,
        borderRadius: R.md,
        padding: S[3],
        minHeight: 92,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <span style={{ ...T.label, fontSize: 13 }}>
          {t("colTable")} <span className="qp-count" style={MONO}>{tb.number}</span>
        </span>
        {info.live ? (
          <span
            className="qp-glow-pulse"
            style={{ width: 8, height: 8, borderRadius: R.pill, background: GLOW.brand, display: "inline-block" }}
            aria-hidden="true"
          />
        ) : null}
      </div>
      <div
        style={{
          ...T.caption,
          color: on ? s.fg : C.muted,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.03em",
          fontSize: 11,
        }}
      >
        {t(info.labelKey)}
      </div>
      <div style={{ ...T.caption, color: C.faint }}>
        <span className="qp-count" style={MONO}>{tb.seats}</span> {tr(locale, "seats")}
        {tb.currentTotalSar ? (
          <>
            {" · "}
            <span className="qp-count" style={MONO}>{fmtInt(tb.currentTotalSar)}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

function FloorLegend({ locale }: { locale: Locale }) {
  const t = (k: keyof typeof UI) => tr(locale, k);
  const items: { key: keyof typeof UI; kind: keyof typeof STATUS }[] = [
    { key: "flAvailable", kind: "neutral" },
    { key: "flSeated", kind: "info" },
    { key: "flOrdered", kind: "warn" },
    { key: "flPaying", kind: "info" },
    { key: "flPaid", kind: "success" },
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: S[2] + 2, marginTop: S[4] }}>
      {items.map((it) => {
        const s = STATUS[it.kind];
        return (
          <span key={it.key} style={{ display: "inline-flex", alignItems: "center", gap: 6, ...T.caption, color: C.muted }}>
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: s.bg, border: `1px solid ${s.border}` }} />
            {t(it.key)}
          </span>
        );
      })}
    </div>
  );
}

// ===========================================================================
// Live orders feed
// ===========================================================================

function OrdersFeed({
  locale,
  orders,
  menuById,
  total,
  now,
}: {
  locale: Locale;
  orders: Order[];
  menuById: Map<string, MenuItem>;
  total: (o: Order) => number;
  now: Date | null;
}) {
  const t = (k: keyof typeof UI) => tr(locale, k);

  if (orders.length === 0) {
    return <EmptyNote locale={locale} textKey="emptyOrders" />;
  }

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: S[2] }}>
      {orders.map((o, i) => {
        const st = ORDER_STATUS[o.status];
        const tableNum = TABLES.find((tb) => tb.id === o.tableId)?.number ?? "?";
        const itemCount = o.items.reduce((a, li) => a + li.qty, 0);
        const elapsed = now ? minsAgo(o.openedAt, now) : null;
        return (
          <OrderRow key={o.id} i={i}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 44 }}>
              <span style={{ ...T.caption, color: C.faint, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 10 }}>
                {t("colTable")}
              </span>
              <span className="qp-count" style={{ ...MONO, ...T.h3 }}>{tableNum}</span>
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: S[2], flexWrap: "wrap" }}>
                <span style={badge(st.kind)}>{t(st.labelKey)}</span>
                <span style={{ ...T.caption, color: C.muted }}>
                  <span className="qp-count" style={MONO}>{o.guests}</span> {t("guestsUnit")}
                  {" · "}
                  <span className="qp-count" style={MONO}>{itemCount}</span> {t("colItems").toLowerCase()}
                </span>
              </div>
              <div style={{ ...T.caption, color: C.faint, marginTop: 2 }}>
                {firstItemName(locale, o, menuById)}
                {elapsed !== null ? <>{" · "} <span className="qp-count" style={MONO}>{elapsed}</span> {t("ago")}</> : null}
              </div>
            </div>

            <div style={{ textAlign: "end" }}>
              <div style={{ ...MONO, fontWeight: 600, fontSize: 15 }}>{fmtInt(total(o))}</div>
              <div style={{ ...T.caption, color: C.faint }}>SAR</div>
            </div>
          </OrderRow>
        );
      })}
    </ul>
  );
}

/** Each order row carries its own reveal observer so the feed staggers in. */
function OrderRow({ i, children }: { i: number; children: React.ReactNode }) {
  const reveal = useReveal<HTMLLIElement>();
  return (
    <li
      ref={reveal.ref}
      className={`qp-reveal-up ${reveal.className} ${staggerDelay(i)}`}
      style={{
        listStyle: "none",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: S[3],
        alignItems: "center",
        padding: `${S[3]}px`,
        borderRadius: R.md,
        background: C.surfaceAlt,
        border: `1px solid ${C.border}`,
      }}
    >
      {children}
    </li>
  );
}

// ===========================================================================
// Top sellers
// ===========================================================================

function TopSellers({
  locale,
  rows,
}: {
  locale: Locale;
  rows: { item: MenuItem; qty: number }[];
}) {
  const t = (k: keyof typeof UI) => tr(locale, k);
  if (rows.length === 0) return <EmptyNote locale={locale} textKey="emptySellers" />;
  const maxQty = Math.max(...rows.map((r) => r.qty));

  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: S[2] + 2 }}>
      {rows.map((r, i) => (
        <li key={r.item.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: S[3], alignItems: "center" }}>
          <span
            className="qp-count"
            style={{
              ...MONO,
              ...T.label,
              width: 24,
              height: 24,
              borderRadius: R.pill,
              background: i === 0 ? C.brand : C.surfaceAlt,
              color: i === 0 ? "#fff" : C.muted,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
            }}
            aria-label={`${t("colRank")} ${i + 1}`}
          >
            {i + 1}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...T.body, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {bi(locale, r.item.name)}
            </div>
            <div
              aria-hidden="true"
              style={{
                marginTop: 4,
                height: 5,
                borderRadius: R.pill,
                background: C.surfaceAlt,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(r.qty / maxQty) * 100}%`,
                  background: C.brand,
                  borderRadius: R.pill,
                }}
              />
            </div>
          </div>
          <div style={{ textAlign: "end" }}>
            <div style={{ ...MONO, fontWeight: 600, fontSize: 14 }}>
              <span className="qp-count">{r.qty}</span>
            </div>
            <div style={{ ...T.caption, color: C.faint }}>{t("colQty").toLowerCase()}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ===========================================================================
// Branch comparison table
// ===========================================================================

function BranchTable({ locale, selected }: { locale: Locale; selected: string }) {
  const t = (k: keyof typeof UI) => tr(locale, k);
  const rows = BRANCHES.map((b) => {
    const sum = BRANCH_SUMMARIES.find((s) => s.branchId === b.id);
    return { b, sum };
  });

  const th: CSSProperties = {
    ...T.caption,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: C.faint,
    textAlign: "start",
    padding: `${S[2]}px ${S[3]}px`,
    borderBottom: `1px solid ${C.border}`,
    whiteSpace: "nowrap",
  };
  const td: CSSProperties = {
    ...T.body,
    fontSize: 14,
    padding: `${S[3]}px`,
    borderBottom: `1px solid ${C.border}`,
    verticalAlign: "middle",
  };

  return (
    <div id="branches" className="qp-scroll-x" style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
        <thead>
          <tr>
            <th style={th}>{t("colBranch")}</th>
            <th style={th}>{t("colCity")}</th>
            <th style={th}>{t("colTier")}</th>
            <th style={{ ...th, textAlign: "end" }}>{t("colTables")}</th>
            <th style={{ ...th, textAlign: "end" }}>{t("colRevenue")}</th>
            <th style={{ ...th, textAlign: "end" }}>{t("colTurns")}</th>
            <th style={{ ...th, textAlign: "end" }}>{t("colTip")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ b, sum }) => {
            const on = b.id === selected || selected === "all";
            return (
              <tr
                key={b.id}
                style={{
                  background: b.id === selected ? C.brandTint : "transparent",
                }}
              >
                <td style={{ ...td, fontWeight: 600 }}>
                  {bi(locale, b.name)}
                  {b.isPilot ? (
                    <span style={{ ...T.caption, color: C.brand, marginInlineStart: 6 }}>{t("pilot")}</span>
                  ) : null}
                </td>
                <td style={{ ...td, color: C.muted }}>{bi(locale, b.city)}</td>
                <td style={td}>
                  <span style={tierBadge(b.tier)}>{b.tier}</span>
                </td>
                <td style={{ ...td, textAlign: "end" }}>
                  <span className="qp-count" style={MONO}>{b.tableCount}</span>
                </td>
                <td style={{ ...td, textAlign: "end" }}>
                  <span className="qp-count" style={{ ...MONO, fontWeight: 600 }}>
                    {sum ? fmtInt(sum.revenueMtdSar) : "-"}
                  </span>
                  <span style={{ ...T.caption, color: C.faint, marginInlineStart: 4 }}>SAR</span>
                </td>
                <td style={{ ...td, textAlign: "end", color: on ? C.text : C.muted }}>
                  <span className="qp-count" style={MONO}>{sum ? fmtDec(sum.tableTurnsToday, 1) : "-"}</span>
                </td>
                <td style={{ ...td, textAlign: "end", color: on ? C.text : C.muted }}>
                  <span className="qp-count" style={MONO}>{sum ? fmtDec(sum.avgTipPct, 1) : "-"}</span>
                  {sum ? <span style={{ ...T.caption, color: C.faint }}>%</span> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function tierBadge(tier: string): CSSProperties {
  const popular = tier === "Scale";
  return {
    ...badge(popular ? "success" : "neutral"),
    textTransform: "none",
    letterSpacing: 0,
    color: popular ? "#fff" : C.muted,
    background: popular ? C.brand : C.surfaceAlt,
    borderColor: "transparent",
  };
}

// ===========================================================================
// Team panel
// ===========================================================================

function TeamPanel({ locale, branchId }: { locale: Locale; branchId: string }) {
  const t = (k: keyof typeof UI) => tr(locale, k);
  const filter = branchId === "all" ? null : branchId;

  // Owner always shows (group-level). Otherwise scope to the selected branch.
  const members = STAFF.filter((m) => m.role === "owner" || !filter || m.branchId === filter);

  // Group: owner under HQ, rest under their branch.
  const groups: { label: string; members: StaffMember[] }[] = [];
  const owners = members.filter((m) => m.role === "owner");
  if (owners.length) groups.push({ label: t("hq"), members: owners });
  BRANCHES.forEach((b) => {
    const ms = members.filter((m) => m.branchId === b.id);
    if (ms.length) groups.push({ label: bi(locale, b.city), members: ms });
  });

  if (groups.every((g) => g.members.length === 0)) {
    return <EmptyNote locale={locale} textKey="emptyOrders" />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: S[4] }}>
      {groups.map((g) => (
        <div key={g.label}>
          <div style={{ ...T.caption, color: C.faint, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: S[2] }}>
            {g.label}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: S[2] }}>
            {g.members.map((m) => {
              const active = m.status === "active";
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: S[2] + 2,
                    padding: `${S[2]}px ${S[3]}px`,
                    borderRadius: R.md,
                    background: C.surfaceAlt,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: R.pill,
                      background: C.brand,
                      color: "#fff",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    {initials(locale, m)}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ ...T.body, fontSize: 14, fontWeight: 600 }}>{bi(locale, m.name)}</div>
                    <div style={{ ...T.caption, color: C.muted }}>{t(ROLE_LABEL[m.role])}</div>
                  </div>
                  <span style={badge(active ? "success" : "neutral")}>
                    {active ? t("stActive") : t("stInvited")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ===========================================================================
// Shared bits
// ===========================================================================

function EmptyNote({ locale, textKey }: { locale: Locale; textKey: keyof typeof UI }) {
  return (
    <div style={{ ...T.body, color: C.muted, padding: `${S[4]}px ${S[2]}px`, textAlign: "center" }}>
      {tr(locale, textKey)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function firstItemName(locale: Locale, o: Order, menuById: Map<string, MenuItem>): string {
  const first = o.items[0];
  if (!first) return "";
  const mi = menuById.get(first.menuItemId);
  if (!mi) return "";
  const extra = o.items.length - 1;
  const name = bi(locale, mi.name);
  return extra > 0
    ? locale === "ar"
      ? `${name} و +${extra}`
      : `${name} +${extra}`
    : name;
}

function minsAgo(iso: string, now: Date): string {
  const then = new Date(iso);
  const mins = Math.max(0, Math.round((now.getTime() - then.getTime()) / 60000));
  if (mins < 60) return String(mins);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h${m}` : `${h}h`;
}

function initials(locale: Locale, m: StaffMember): string {
  const name = bi(locale, m.name);
  const parts = name.split(" ").filter(Boolean);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}
