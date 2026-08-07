"use client";

// Shared layer for /demo/admin and its subpages: the locale/branch demo state
// (context), the sidebar + topbar chrome, and every presentational panel +
// helper that the overview and the per-section subpages render. Pulled out of
// the original single-file page.tsx so app/demo/admin/layout.tsx can wrap all
// routes in one shell and each subpage reuses the same components + mock data.
//
// Paper-ledger light system (C.* tokens), Arabic-first RTL default. Nothing
// here is production: no fetch, no Supabase, no auth. All data from _data.ts.

import { createContext, useContext, useMemo, useState, useEffect, useRef, type ReactNode, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  C,
  R,
  S,
  T,
  NUM,
  MONO,
  STATUS,
  SHADOW,
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
  BRANCH_SUMMARIES,
  STAFF,
  type Bilingual,
  type Table,
  type TableState,
  type Order,
  type MenuItem,
  type StaffMember,
} from "../_data";

// ---------------------------------------------------------------------------
// Locale + UI chrome dictionary
// ---------------------------------------------------------------------------

export type Locale = "ar" | "en";

/** Which demo persona is driving the admin shell. Drives nav filtering, the
 *  Settings page variant, and the branch-only floor interactivity. In-memory
 *  client state only (no persistence). */
export type DemoRole = "group" | "branch";

export const UI = {
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
  // role switch (demo surfaces)
  demoRole: { en: "Demo role", ar: "دور التجربة" },
  switchToBranch: { en: "Branch admin", ar: "مدير الفرع" },
  switchToAdmin: { en: "Group admin", ar: "إدارة المجموعة" },
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
  last14: { en: "Last 14 days", ar: "آخر ١٤ يومًا" },
  revenueSeries: { en: "Revenue (SAR)", ar: "الإيرادات (ر.س)" },
  floor: { en: "Floor", ar: "الصالة" },
  floorSub: { en: "Live table occupancy", ar: "حالة الطاولات مباشرة" },
  liveOrders: { en: "Live orders", ar: "الطلبات الحية" },
  topSellers: { en: "Top sellers", ar: "الأكثر مبيعًا" },
  topSellersSub: { en: "By quantity sold", ar: "حسب الكمية المباعة" },
  branchCompare: { en: "Branch comparison", ar: "مقارنة الفروع" },
  branchDetail: { en: "Branch detail", ar: "تفاصيل الفرع" },
  team: { en: "Team", ar: "الفريق" },
  analyticsBreakdown: { en: "Daily breakdown", ar: "التفصيل اليومي" },
  paymentMix: { en: "Payment method mix", ar: "توزيع طرق الدفع" },
  // view-all affordance on overview panels
  viewAll: { en: "View all", ar: "عرض الكل" },
  // table columns / cells
  colBranch: { en: "Branch", ar: "الفرع" },
  colCity: { en: "City", ar: "المدينة" },
  colAddress: { en: "Address", ar: "العنوان" },
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
  colPrice: { en: "Price", ar: "السعر" },
  colId: { en: "ID", ar: "المعرّف" },
  colMethod: { en: "Method", ar: "الطريقة" },
  colSplit: { en: "Split", ar: "تقسيم" },
  colTime: { en: "Time", ar: "الوقت" },
  colOrders: { en: "Orders", ar: "طلبات" },
  colAvgTicket: { en: "Avg ticket", ar: "متوسط الفاتورة" },
  colAvgTurn: { en: "Avg turn", ar: "متوسط الدوران" },
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
  // transaction status + methods + split
  txnCompleted: { en: "Completed", ar: "مكتملة" },
  txnRefunded: { en: "Refunded", ar: "مسترجعة" },
  txnPending: { en: "Pending", ar: "قيد الانتظار" },
  payMada: { en: "mada", ar: "مدى" },
  payVisa: { en: "Visa", ar: "فيزا" },
  payApplePay: { en: "Apple Pay", ar: "Apple Pay" },
  payStcPay: { en: "STC Pay", ar: "STC Pay" },
  splitEven: { en: "Even split", ar: "تقسيم متساوٍ" },
  splitByItem: { en: "By item", ar: "حسب الصنف" },
  splitFull: { en: "Full bill", ar: "الفاتورة كاملة" },
  // menu
  popularTag: { en: "Popular", ar: "الأكثر طلبًا" },
  spicyTag: { en: "Spicy", ar: "حار" },
  // misc
  emptyFloor: { en: "No live table data for this branch yet.", ar: "لا توجد بيانات طاولات حية لهذا الفرع بعد." },
  emptyOrders: { en: "No open orders at this branch right now.", ar: "لا توجد طلبات مفتوحة في هذا الفرع الآن." },
  emptySellers: { en: "No sales recorded yet.", ar: "لا توجد مبيعات مسجلة بعد." },
  langToggle: { en: "EN", ar: "ع" },
  seats: { en: "seats", ar: "مقاعد" },
  guestsUnit: { en: "guests", ar: "ضيف" },
  ago: { en: "ago", ar: "منذ" },
  // settings + interactivity (demo-only surfaces)
  navSettings: { en: "Settings", ar: "الإعدادات" },
  settingsSubBranch: { en: "Branch configuration (demo)", ar: "إعدادات الفرع (تجريبي)" },
  settingsSubGroup: { en: "Group configuration (demo)", ar: "إعدادات المجموعة (تجريبي)" },
  secIntegration: { en: "POS integration", ar: "تكامل نقاط البيع" },
  posProvider: { en: "POS provider", ar: "مزوّد نقاط البيع" },
  posConnected: { en: "Connected", ar: "متصل" },
  posDisconnected: { en: "Not connected", ar: "غير متصل" },
  connect: { en: "Connect", ar: "ربط" },
  disconnect: { en: "Disconnect", ar: "قطع الربط" },
  branchIdField: { en: "Branch ID", ar: "معرّف الفرع" },
  zatcaIdField: { en: "ZATCA ID", ar: "المعرّف الضريبي (زاتكا)" },
  secProfile: { en: "Restaurant profile", ar: "ملف المطعم" },
  legalNameField: { en: "Legal name", ar: "الاسم القانوني" },
  vatNumberField: { en: "VAT number", ar: "الرقم الضريبي" },
  defaultCurrencyField: { en: "Default currency", ar: "العملة الافتراضية" },
  save: { en: "Save changes", ar: "حفظ التغييرات" },
  saved: { en: "Saved (demo)", ar: "تم الحفظ (تجريبي)" },
  addOrder: { en: "Add order", ar: "إضافة طلب" },
  markSeated: { en: "Mark seated", ar: "تأكيد الجلوس" },
  selectTable: { en: "Table", ar: "الطاولة" },
  selectItem: { en: "Item", ar: "الصنف" },
  add: { en: "Add", ar: "إضافة" },
  orderAdded: { en: "Order added to table (demo)", ar: "تمت إضافة الطلب إلى الطاولة (تجريبي)" },
  seatedMarked: { en: "Table marked seated (demo)", ar: "تم تأكيد جلوس الطاولة (تجريبي)" },
  noFreeTables: { en: "No free tables", ar: "لا توجد طاولات متاحة" },
  addMember: { en: "Add member", ar: "إضافة عضو" },
  memberName: { en: "Name", ar: "الاسم" },
  memberRole: { en: "Role", ar: "الدور" },
  remove: { en: "Remove", ar: "إزالة" },
  memberAdded: { en: "Member added (demo)", ar: "تمت إضافة العضو (تجريبي)" },
  memberRemoved: { en: "Member removed (demo)", ar: "تمت إزالة العضو (تجريبي)" },
  nameRequired: { en: "Enter a name", ar: "أدخل اسمًا" },
  editItem: { en: "Edit item", ar: "تعديل الصنف" },
  edit: { en: "Edit", ar: "تعديل" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  itemName: { en: "Item name", ar: "اسم الصنف" },
  itemPrice: { en: "Price (SAR)", ar: "السعر (ر.س)" },
  itemSaved: { en: "Item updated (demo)", ar: "تم تحديث الصنف (تجريبي)" },
} as const satisfies Record<string, Bilingual>;

export type UIKey = keyof typeof UI;

export const tr = (locale: Locale, key: UIKey) =>
  locale === "ar" ? UI[key].ar : UI[key].en;

export const bi = (locale: Locale, b: Bilingual) => (locale === "ar" ? b.ar : b.en);

/** Shared uppercase field-label style for the admin subpages (DRY — used by
 *  settings, tables, team, menu). */
export const LABEL_STYLE: CSSProperties = {
  ...T.caption,
  color: C.muted,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  display: "block",
  marginBottom: 6,
};

// Latin-digit grouping for every figure (numbers stay LTR inside RTL flow via MONO).
export const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");
export const fmtDec = (n: number, d = 1) =>
  n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

// ---------------------------------------------------------------------------
// Sidebar nav: real routes, not same-page anchors. Dashboard == the overview.
// ---------------------------------------------------------------------------

// Each item declares which demo roles see it. Filtering happens in the sidebar.
// Branch admin: Dashboard, Tables, Orders, Menu, Team, Settings.
// Group admin: Dashboard, Tables, Branches, Transactions, Menu, Analytics, Team,
// Settings (Orders is branch-only).
export const NAV: { key: UIKey; href: string; roles: DemoRole[] }[] = [
  { key: "navDashboard", href: "/demo/admin", roles: ["group", "branch"] },
  { key: "navTables", href: "/demo/admin/tables", roles: ["group", "branch"] },
  { key: "navOrders", href: "/demo/admin/orders", roles: ["branch"] },
  { key: "navBranches", href: "/demo/admin/branches", roles: ["group"] },
  { key: "navTransactions", href: "/demo/admin/transactions", roles: ["group"] },
  { key: "navMenu", href: "/demo/admin/menu", roles: ["group", "branch"] },
  { key: "navAnalytics", href: "/demo/admin/analytics", roles: ["group"] },
  { key: "navTeam", href: "/demo/admin/team", roles: ["group", "branch"] },
  { key: "navSettings", href: "/demo/admin/settings", roles: ["group", "branch"] },
];

// ---------------------------------------------------------------------------
// Demo state (locale + branch scope) shared across the shell + every subpage.
// ---------------------------------------------------------------------------

export interface AdminDemoState {
  locale: Locale;
  setLocale: (l: Locale) => void;
  branchId: string;
  setBranchId: (id: string) => void;
  role: DemoRole;
  setRole: (r: DemoRole) => void;
  // Editable in-memory mock data (criterion 5). Seeded from _data.ts; mutations
  // live only for the session (no fetch / localStorage). Lifted into the shell
  // context so tables/menu/team edits persist across subpage navigation.
  tables: Table[];
  setTables: Dispatch<SetStateAction<Table[]>>;
  menuItems: MenuItem[];
  setMenuItems: Dispatch<SetStateAction<MenuItem[]>>;
  staff: StaffMember[];
  setStaff: Dispatch<SetStateAction<StaffMember[]>>;
}

const AdminDemoContext = createContext<AdminDemoState | null>(null);

export function useAdminDemo(): AdminDemoState {
  const v = useContext(AdminDemoContext);
  if (!v) throw new Error("useAdminDemo must be used within AdminDemoProvider");
  return v;
}

export function AdminDemoProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar");
  const [branchId, setBranchId] = useState<string>("br_dhahran");
  const [role, setRole] = useState<DemoRole>("group");
  const [tables, setTables] = useState<Table[]>(TABLES);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MENU_ITEMS);
  const [staff, setStaff] = useState<StaffMember[]>(STAFF);
  const setLocale = (l: Locale) => setLocaleState(l);
  const setBranch = (id: string) => setBranchId(id);
  const value = useMemo<AdminDemoState>(
    () => ({
      locale,
      setLocale,
      branchId,
      setBranchId: setBranch,
      role,
      setRole,
      tables,
      setTables,
      menuItems,
      setMenuItems,
      staff,
      setStaff,
    }),
    [locale, branchId, role, tables, menuItems, staff],
  );
  return <AdminDemoContext.Provider value={value}>{children}</AdminDemoContext.Provider>;
}

// ---------------------------------------------------------------------------
// Floor / order / role presentation maps
// ---------------------------------------------------------------------------

type FloorInfo = {
  labelKey: UIKey;
  kind: keyof typeof STATUS;
  live?: boolean;
  dim?: boolean;
};

export const FLOOR: Record<TableState, FloorInfo> = {
  available: { labelKey: "flAvailable", kind: "neutral" },
  seated: { labelKey: "flSeated", kind: "info" },
  ordered: { labelKey: "flOrdered", kind: "warn" },
  bill_requested: { labelKey: "flBill", kind: "warn", live: true },
  paying: { labelKey: "flPaying", kind: "info" },
  paid: { labelKey: "flPaid", kind: "success" },
  cleaning: { labelKey: "flCleaning", kind: "neutral", dim: true },
};

export const ORDER_STATUS: Record<Order["status"], { labelKey: UIKey; kind: keyof typeof STATUS }> = {
  open: { labelKey: "stOpen", kind: "neutral" },
  sent: { labelKey: "stSent", kind: "info" },
  preparing: { labelKey: "stPreparing", kind: "warn" },
  served: { labelKey: "stServed", kind: "success" },
  closed: { labelKey: "stClosed", kind: "neutral" },
};

export const ROLE_LABEL: Record<StaffMember["role"], UIKey> = {
  owner: "roleOwner",
  branch_manager: "roleManager",
  server: "roleServer",
  cashier: "roleCashier",
};

export const OCCUPIED: TableState[] = ["seated", "ordered", "bill_requested", "paying", "paid"];

// ---------------------------------------------------------------------------
// Count-up hook (unchanged from the original single-file page)
// ---------------------------------------------------------------------------

export function useCountUp(target: number, duration = 1100) {
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
// Shell: sidebar + topbar + main content slot (rendered by layout.tsx)
// ---------------------------------------------------------------------------

export function AdminShell({ children }: { children: ReactNode }) {
  const { locale } = useAdminDemo();
  const dir = locale === "ar" ? "rtl" : "ltr";

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
      <AdminSidebar />

      <main style={{ flex: 1, minWidth: 0 }}>
        <AdminTopBar />

        <div style={{ padding: `${S[5]}px ${S[6]}px ${S[7]}px`, maxWidth: 1320 }}>
          {children}
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

function AdminSidebar() {
  const { locale, role } = useAdminDemo();
  const pathname = usePathname();
  const t = (k: UIKey) => tr(locale, k);
  const items = NAV.filter((it) => it.roles.includes(role));

  return (
    <div
      className="qp-sidebar"
      style={{
        width: 244,
        flexShrink: 0,
        background: C.surface,
        color: C.text,
        borderInlineEnd: `1px solid ${C.border}`,
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
        <span style={{ ...T.h2, fontWeight: 700, color: C.text }}>Nuqra</span>
      </div>
      <div
        className="qp-hide-mobile"
        style={{
          ...T.caption,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: C.muted,
          padding: `0 ${S[3]}px ${S[1]}px`,
        }}
      >
        {t("manage")}
      </div>
      <nav aria-label={t("manage")} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((it) => {
          const on = isActive(pathname, it.href);
          return (
            <Link
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
                color: on ? "#fff" : C.muted,
                boxShadow: on ? SHADOW.cta : undefined,
                minHeight: 40,
              }}
            >
              {t(it.key)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/demo/admin") return pathname === "/demo/admin" || pathname === "/demo/admin/";
  return pathname === href || pathname.startsWith(href + "/");
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
// Top bar: identity, branch switcher, demo role switch, locale toggle
// ===========================================================================

function AdminTopBar() {
  const { locale, setLocale, branchId, setBranchId } = useAdminDemo();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const t = (k: UIKey) => tr(locale, k);
  const branch = BRANCHES.find((b) => b.id === branchId);

  return (
    <header
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
        <BranchSwitcher value={branchId} onChange={setBranchId} />
        <RoleSwitch />
        <button
          type="button"
          onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
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
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const { locale } = useAdminDemo();
  const t = (k: UIKey) => tr(locale, k);
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

/** Demo role toggle: Group admin ⇄ Branch admin, in-place (client state in the
 *  shell context). Drives nav filtering, the Settings variant, and the
 *  branch-only floor interactivity. Mirrors the BranchSwitcher segmented shape. */
function RoleSwitch() {
  const { locale, role, setRole } = useAdminDemo();
  const t = (k: UIKey) => tr(locale, k);
  const opts: { id: DemoRole; label: string }[] = [
    { id: "group", label: t("switchToAdmin") },
    { id: "branch", label: t("switchToBranch") },
  ];
  return (
    <div
      role="group"
      aria-label={t("demoRole")}
      style={{
        display: "inline-flex",
        background: C.surfaceAlt,
        border: `1px solid ${C.border}`,
        borderRadius: R.md,
        padding: 3,
        gap: 2,
      }}
    >
      {opts.map((o) => {
        const on = o.id === role;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => setRole(o.id)}
            aria-pressed={on}
            className="qp-press"
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
// KPI strip
// ===========================================================================

export function KpiStrip({
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
  const t = (k: UIKey) => tr(locale, k);
  const reveal = useReveal<HTMLElement>();
  const min = Math.min(...series7.map((p) => p.revenueSar));
  const max = Math.max(...series7.map((p) => p.revenueSar));

  return (
    <section
      ref={reveal.ref}
      className={`qp-reveal-up qp-kpi ${reveal.className}`}
      style={{
        background: C.surface,
        color: C.text,
        border: `1px solid ${C.border}`,
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
        label={t("kpiRevenue")}
        sub={t("kpiRevenueSub")}
        target={kpi.revenueMtd}
        format={(n) => fmtInt(n)}
        suffix="SAR"
        accent
      />
      <KpiTile
        key={`tip-${scopeKey}`}
        label={t("kpiTip")}
        sub={null}
        target={kpi.avgTip}
        format={(n) => fmtDec(n, 1)}
        suffix="%"
      />
      <KpiTile
        key={`turns-${scopeKey}`}
        label={t("kpiTurns")}
        sub={t("kpiTurnsSub")}
        target={kpi.turns}
        format={(n) => fmtDec(n, 1)}
      />
      <KpiTile
        key={`active-${scopeKey}`}
        label={t("kpiActive")}
        sub={scopeKey !== "all" && kpi.activeTables === 0 ? t("kpiNoData") : t("kpiActiveSub")}
        target={kpi.activeTables}
        format={(n) => fmtInt(n)}
      />

      {/* Pilot today + sparkline */}
      <div className="qp-kpi-spark" style={{ display: "flex", flexDirection: "column", gap: S[2], minWidth: 0 }}>
        <div style={{ ...T.caption, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
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
  label,
  sub,
  target,
  format,
  suffix,
  accent,
}: {
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
      <div style={{ ...T.caption, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
        <span
          ref={ref}
          className="qp-count"
          style={{
            ...MONO,
            color: accent ? C.brand : C.text,
            fontSize: "clamp(28px, 3vw, 40px)",
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          {format(val)}
        </span>
        {suffix ? (
          <span style={{ ...T.label, color: C.muted, fontSize: 13, textTransform: "none", letterSpacing: 0 }}>
            {suffix}
          </span>
        ) : null}
      </div>
      {sub ? <div style={{ ...T.caption, color: C.muted }}>{sub}</div> : null}
    </div>
  );
}

function PilotStat({ figure, unit }: { figure: string; unit: string }) {
  return (
    <div>
      <span className="qp-count" style={{ ...MONO, color: C.text, fontSize: 16, fontWeight: 600 }}>
        {figure}
      </span>
      {unit ? <span style={{ ...T.caption, color: C.muted, marginInlineStart: 3 }}>{unit}</span> : null}
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
          <stop offset="0%" stopColor={C.brand} stopOpacity={0.32} />
          <stop offset="100%" stopColor={C.brand} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#qp-spark)" />
      <path d={line} fill="none" stroke={C.brand} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ===========================================================================
// Section card wrapper (light surface) — optional view-all link in the header
// ===========================================================================

export function SectionCard({
  title,
  sub,
  viewAll,
  children,
}: {
  title: string;
  sub?: string | null;
  viewAll?: { href: string; label: string };
  children: ReactNode;
}) {
  const reveal = useReveal<HTMLDivElement>();
  return (
    <section
      ref={reveal.ref}
      className={`qp-reveal-up ${reveal.className}`}
      style={{ ...card({ pad: S[5] }), height: "100%" }}
    >
      <header style={{ marginBottom: S[4], display: "flex", alignItems: "baseline", gap: S[3] }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ ...T.h3, margin: 0 }}>{title}</h2>
          {sub ? <div style={{ ...T.caption, color: C.muted, marginTop: 2 }}>{sub}</div> : null}
        </div>
        {viewAll ? (
          <Link
            href={viewAll.href}
            style={{
              ...T.label,
              marginInlineStart: "auto",
              color: C.brand,
              textDecoration: "none",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {viewAll.label}
          </Link>
        ) : null}
      </header>
      {children}
    </section>
  );
}

/** Bare page heading for subpages (spacing-led, no boxed card around the title). */
export function PageHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <header style={{ marginBottom: S[5] }}>
      <h1 style={{ ...T.h1, margin: 0 }}>{title}</h1>
      {sub ? <p style={{ ...T.body, color: C.muted, margin: `${S[2]}px 0 0` }}>{sub}</p> : null}
    </header>
  );
}

// ===========================================================================
// Revenue chart (inline SVG area + line, hover tooltip, accessible label)
// ===========================================================================

export function RevenueChart({
  locale,
  series,
}: {
  locale: Locale;
  series: { date: string; revenueSar: number; orders: number }[];
}) {
  const t = (k: UIKey) => tr(locale, k);
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
              background: C.surface,
              color: C.text,
              border: `1px solid ${C.border}`,
              borderRadius: R.sm,
              padding: "6px 10px",
              boxShadow: SHADOW.e2,
              whiteSpace: "nowrap",
              textAlign: "center",
            }}
          >
            <div style={{ ...T.caption, color: C.muted }}>{fmtDay(series[hover].date)}</div>
            <div style={{ ...MONO, fontSize: 13, fontWeight: 600 }}>
              {fmtInt(series[hover].revenueSar)} <span style={{ color: C.muted, fontFamily: "inherit", letterSpacing: 0 }}>SAR</span>
            </div>
            <div style={{ ...T.caption, color: C.muted }}>
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

export function FloorGrid({
  locale,
  tables,
}: {
  locale: Locale;
  tables: { id: string; number: number; seats: number; state: TableState; guests?: number; currentTotalSar?: number }[];
}) {
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
          <FloorTile key={tb.id} locale={locale} tb={tb} i={i} />
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
}: {
  locale: Locale;
  tb: { number: number; seats: number; state: TableState; currentTotalSar?: number };
  i: number;
}) {
  const reveal = useReveal<HTMLDivElement>();
  const t = (k: UIKey) => tr(locale, k);
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
            style={{ width: 8, height: 8, borderRadius: R.pill, background: C.brand, display: "inline-block" }}
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
      <div style={{ ...T.caption, color: C.muted }}>
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
  const t = (k: UIKey) => tr(locale, k);
  const items: { key: UIKey; kind: keyof typeof STATUS }[] = [
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

export function OrdersFeed({
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
  if (orders.length === 0) {
    return <EmptyNote locale={locale} textKey="emptyOrders" />;
  }

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: S[2] }}>
      {orders.map((o, i) => {
        const st = ORDER_STATUS[o.status];
        const t = (k: UIKey) => tr(locale, k);
        const tableNum = TABLES.find((tb) => tb.id === o.tableId)?.number ?? "?";
        const itemCount = o.items.reduce((a, li) => a + li.qty, 0);
        const elapsed = now ? minsAgo(o.openedAt, now) : null;
        return (
          <OrderRow key={o.id} i={i}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 44 }}>
              <span style={{ ...T.caption, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 10 }}>
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
              <div style={{ ...T.caption, color: C.muted, marginTop: 2 }}>
                {firstItemName(locale, o, menuById)}
                {elapsed !== null ? <>{" · "} <span className="qp-count" style={MONO}>{elapsed}</span> {t("ago")}</> : null}
              </div>
            </div>

            <div style={{ textAlign: "end" }}>
              <div style={{ ...MONO, fontWeight: 600, fontSize: 15 }}>{fmtInt(total(o))}</div>
              <div style={{ ...T.caption, color: C.muted }}>SAR</div>
            </div>
          </OrderRow>
        );
      })}
    </ul>
  );
}

/** Each order row carries its own reveal observer so the feed staggers in. */
function OrderRow({ i, children }: { i: number; children: ReactNode }) {
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

export function TopSellers({
  locale,
  rows,
}: {
  locale: Locale;
  rows: { item: MenuItem; qty: number }[];
}) {
  const t = (k: UIKey) => tr(locale, k);
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
            <div style={{ ...T.caption, color: C.muted }}>{t("colQty").toLowerCase()}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ===========================================================================
// Branch comparison table
// ===========================================================================

export function BranchTable({ locale, selected }: { locale: Locale; selected: string }) {
  const t = (k: UIKey) => tr(locale, k);
  const rows = BRANCHES.map((b) => {
    const sum = BRANCH_SUMMARIES.find((s) => s.branchId === b.id);
    return { b, sum };
  });

  const th: CSSProperties = {
    ...T.caption,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: C.muted,
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
    <div className="qp-scroll-x" style={{ overflowX: "auto" }}>
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
                  <span style={{ ...T.caption, color: C.muted, marginInlineStart: 4 }}>SAR</span>
                </td>
                <td style={{ ...td, textAlign: "end", color: on ? C.text : C.muted }}>
                  <span className="qp-count" style={MONO}>{sum ? fmtDec(sum.tableTurnsToday, 1) : "-"}</span>
                </td>
                <td style={{ ...td, textAlign: "end", color: on ? C.text : C.muted }}>
                  <span className="qp-count" style={MONO}>{sum ? fmtDec(sum.avgTipPct, 1) : "-"}</span>
                  {sum ? <span style={{ ...T.caption, color: C.muted }}>%</span> : null}
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

export function TeamPanel({
  locale,
  branchId,
  staff = STAFF,
  onRemove,
}: {
  locale: Locale;
  branchId: string;
  staff?: StaffMember[];
  onRemove?: (id: string) => void;
}) {
  const t = (k: UIKey) => tr(locale, k);
  const filter = branchId === "all" ? null : branchId;

  // Owner always shows (group-level). Otherwise scope to the selected branch.
  const members = staff.filter((m) => m.role === "owner" || !filter || m.branchId === filter);

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
          <div style={{ ...T.caption, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: S[2] }}>
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
                  {onRemove && m.role !== "owner" ? (
                    <button
                      type="button"
                      onClick={() => onRemove(m.id)}
                      aria-label={`${t("remove")} ${bi(locale, m.name)}`}
                      className="qp-press"
                      style={{
                        ...T.caption,
                        border: `1px solid ${C.border}`,
                        background: "transparent",
                        color: C.muted,
                        borderRadius: R.sm,
                        padding: "4px 10px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t("remove")}
                    </button>
                  ) : null}
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

export function EmptyNote({ locale, textKey }: { locale: Locale; textKey: UIKey }) {
  return (
    <div style={{ ...T.body, color: C.muted, padding: `${S[4]}px ${S[2]}px`, textAlign: "center" }}>
      {tr(locale, textKey)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function firstItemName(locale: Locale, o: Order, menuById: Map<string, MenuItem>): string {
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

export function minsAgo(iso: string, now: Date): string {
  const then = new Date(iso);
  const mins = Math.max(0, Math.round((now.getTime() - then.getTime()) / 60000));
  if (mins < 60) return String(mins);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h${m}` : `${h}h`;
}

export function initials(locale: Locale, m: StaffMember): string {
  const name = bi(locale, m.name);
  const parts = name.split(" ").filter(Boolean);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}
