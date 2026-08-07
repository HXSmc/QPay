"use client";

// /demo/admin/orders: the live-orders panel promoted to a page. Every open
// order for the scoped branch (page width), plus a one-line status breakdown.

import { useEffect, useMemo, useState } from "react";
import { C, S, T, MONO, card } from "../../../lib/theme";
import { MENU_ITEMS, ORDERS, type Order, type MenuItem } from "../../_data";
import {
  OrdersFeed,
  PageHead,
  useAdminDemo,
  tr,
  ORDER_STATUS,
  type UIKey,
} from "../_shared";

export default function OrdersPage() {
  const { locale, branchId } = useAdminDemo();
  const t = (k: UIKey) => tr(locale, k);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const menuById = useMemo(() => {
    const m = new Map<string, MenuItem>();
    MENU_ITEMS.forEach((mi) => m.set(mi.id, mi));
    return m;
  }, []);

  const orderTotal = (o: Order) =>
    o.items.reduce((a, li) => a + (menuById.get(li.menuItemId)?.priceSar ?? 0) * li.qty, 0);

  const openOrders = useMemo(() => {
    const filter = branchId === "all" ? null : branchId;
    return ORDERS.filter((o) => !filter || o.branchId === filter).filter((o) => o.status !== "closed");
  }, [branchId]);

  // Status breakdown across the open set.
  const byStatus = useMemo(() => {
    const counts = new Map<Order["status"], number>();
    openOrders.forEach((o) => counts.set(o.status, (counts.get(o.status) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [openOrders]);

  return (
    <>
      <PageHead title={t("liveOrders")} />

      {byStatus.length > 0 ? (
        <div style={{ display: "flex", gap: S[5], flexWrap: "wrap", marginBottom: S[5] }}>
          {byStatus.map(([status, count]) => (
            <div key={status}>
              <span className="qp-count" style={{ ...MONO, ...T.h2, color: C.brand }}>{count}</span>
              <span style={{ ...T.caption, color: C.muted, marginInlineStart: S[2] }}>{t(ORDER_STATUS[status].labelKey)}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ ...card({ pad: S[5], radius: 14 }) }}>
        <OrdersFeed locale={locale} orders={openOrders} menuById={menuById} total={orderTotal} now={now} />
      </div>
    </>
  );
}
