"use client";

// /demo/admin: the overview dashboard. All chrome (sidebar, topbar, locale +
// branch state) lives in layout.tsx / _shared.tsx; this page renders the bento
// of summary panels and links each one to its fuller subpage (view-all).
// Built entirely from app/demo/_data.ts mock content. Paper-ledger light system.

import { useEffect, useMemo, useState } from "react";
import { S } from "../../lib/theme";
import {
  TABLES,
  MENU_ITEMS,
  ORDERS,
  ANALYTICS_DHAHRAN,
  BRANCH_SUMMARIES,
  type Order,
  type MenuItem,
} from "../_data";
import {
  KpiStrip,
  SectionCard,
  RevenueChart,
  FloorGrid,
  OrdersFeed,
  TopSellers,
  BranchTable,
  TeamPanel,
  useAdminDemo,
  tr,
  type UIKey,
} from "./_shared";

const OCCUPIED = ["seated", "ordered", "bill_requested", "paying", "paid"];

export default function DemoAdminPage() {
  const { locale, branchId } = useAdminDemo();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const t = (k: UIKey) => tr(locale, k);
  const va = (href: string) => ({ href, label: t("viewAll") });

  // Scope mock data to the selected branch ("all" = group aggregate view).
  const scope = useMemo(() => {
    const filter = branchId === "all" ? null : branchId;
    const tables = TABLES.filter((tb) => !filter || tb.branchId === filter);
    const orders = ORDERS.filter((o) => !filter || o.branchId === filter);
    const summaries = BRANCH_SUMMARIES.filter((s) => !filter || s.branchId === filter);
    return { tables, orders, summaries };
  }, [branchId]);

  const kpi = useMemo(() => {
    const sums = scope.summaries;
    const revenueMtd = sums.reduce((a, s) => a + s.revenueMtdSar, 0);
    const avgTip = sums.length ? sums.reduce((a, s) => a + s.avgTipPct, 0) / sums.length : 0;
    const turns = sums.length ? sums.reduce((a, s) => a + s.tableTurnsToday, 0) / sums.length : 0;
    const activeTables = scope.tables.filter((tb) => OCCUPIED.includes(tb.state)).length;
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

  return (
    <>
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
        <SectionCard title={t("revenueTrend")} sub={t("last7")} viewAll={va("/demo/admin/analytics")}>
          <RevenueChart locale={locale} series={series7} />
        </SectionCard>

        <SectionCard title={t("floor")} sub={t("floorSub")} viewAll={va("/demo/admin/tables")}>
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
        <SectionCard title={t("liveOrders")} viewAll={va("/demo/admin/orders")}>
          <OrdersFeed locale={locale} orders={openOrders} menuById={menuById} total={orderTotal} now={now} />
        </SectionCard>

        <SectionCard title={t("topSellers")} sub={t("topSellersSub")} viewAll={va("/demo/admin/menu")}>
          <TopSellers locale={locale} rows={sellers} />
        </SectionCard>

        <SectionCard title={t("team")} viewAll={va("/demo/admin/team")}>
          <TeamPanel locale={locale} branchId={branchId} />
        </SectionCard>
      </div>

      <div style={{ marginTop: S[5] }}>
        <SectionCard title={t("branchCompare")} viewAll={va("/demo/admin/branches")}>
          <BranchTable locale={locale} selected={branchId} />
        </SectionCard>
      </div>
    </>
  );
}
