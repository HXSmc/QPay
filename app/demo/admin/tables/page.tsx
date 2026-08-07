"use client";

// /demo/admin/tables: the floor panel promoted to a page. Live table grid for
// the scoped branch (or all branches), plus a one-line occupancy summary.
// Branch admin also gets client-state interactivity: mark a free table seated
// and add an order to a table (table state reflects it). In-memory only.

import { useMemo, useState } from "react";
import { C, S, T, MONO, R, card, field, btn, STATUS } from "../../../lib/theme";
import { type Table, type TableState } from "../../_data";
import {
  FloorGrid,
  PageHead,
  useAdminDemo,
  tr,
  OCCUPIED,
  LABEL_STYLE,
  type UIKey,
} from "../_shared";

export default function TablesPage() {
  const { locale, branchId, role, tables, setTables, menuItems } = useAdminDemo();
  const t = (k: UIKey) => tr(locale, k);

  const scoped = useMemo(() => {
    const filter = branchId === "all" ? null : branchId;
    return tables.filter((tb) => !filter || tb.branchId === filter);
  }, [tables, branchId]);

  const occupied = scoped.filter((tb) => OCCUPIED.includes(tb.state)).length;
  const free = scoped.filter((tb) => tb.state === "available").length;

  const stats = [
    { label: t("flSeated"), value: String(occupied) },
    { label: t("flAvailable"), value: String(free) },
    { label: t("colTables"), value: String(scoped.length) },
  ];

  return (
    <>
      <PageHead title={t("floor")} sub={t("floorSub")} />

      <div style={{ display: "flex", gap: S[5], flexWrap: "wrap", marginBottom: S[5] }}>
        {stats.map((s) => (
          <div key={s.label}>
            <span className="qp-count" style={{ ...MONO, ...T.h2, color: C.brand }}>{s.value}</span>
            <span style={{ ...T.caption, color: C.muted, marginInlineStart: S[2] }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* key={branchId} remounts per branch so the seatId/orderTableId/itemId
          seeds resync to the newly-scoped tables (no stale cross-branch state). */}
      {role === "branch" ? (
        <FloorActions
          key={branchId}
          locale={locale}
          tables={scoped}
          menuItems={menuItems}
          onMarkSeated={(id) => {
            setTables((prev) =>
              prev.map((tb) =>
                tb.id === id
                  ? { ...tb, state: "seated" as TableState, guests: tb.guests ?? 2, openedAt: new Date().toISOString() }
                  : tb,
              ),
            );
          }}
          onAddOrder={(id, total) => {
            setTables((prev) =>
              prev.map((tb) =>
                tb.id === id
                  ? {
                      ...tb,
                      state: "ordered" as TableState,
                      guests: tb.guests ?? 2,
                      openedAt: tb.openedAt ?? new Date().toISOString(),
                      currentTotalSar: (tb.currentTotalSar ?? 0) + total,
                    }
                  : tb,
              ),
            );
          }}
        />
      ) : null}

      <div style={{ ...card({ pad: S[5], radius: 14 }) }}>
        <FloorGrid locale={locale} tables={scoped} />
      </div>
    </>
  );
}

/** Branch-only floor actions: mark a free table seated, add an order to a table.
 *  Pure client state — calls back into the shell context setters. */
function FloorActions({
  locale,
  tables,
  menuItems,
  onMarkSeated,
  onAddOrder,
}: {
  locale: "ar" | "en";
  tables: Table[];
  menuItems: { id: string; name: { en: string; ar: string }; priceSar: number }[];
  onMarkSeated: (id: string) => void;
  onAddOrder: (id: string, totalSar: number) => void;
}) {
  const t = (k: UIKey) => tr(locale, k);
  const freeTables = tables.filter((tb) => tb.state === "available");
  const [seatId, setSeatId] = useState<string>(freeTables[0]?.id ?? "");
  const [orderTableId, setOrderTableId] = useState<string>(tables[0]?.id ?? "");
  const [itemId, setItemId] = useState<string>(menuItems[0]?.id ?? "");
  const [qty, setQty] = useState<number>(1);
  const [flash, setFlash] = useState<string | null>(null);

  const name = (b: { en: string; ar: string }) => (locale === "ar" ? b.ar : b.en);

  const selectStyle = { ...field(), padding: "9px 11px", fontSize: 14 };

  return (
    <section
      style={{
        ...card({ pad: S[5], radius: 14 }),
        marginBottom: S[5],
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: S[5],
      }}
      className="qp-admin-2col"
    >
      {/* Mark seated */}
      <div style={{ minWidth: 0 }}>
        <div style={{ ...T.body, fontSize: 15, fontWeight: 600, marginBottom: S[1] }}>{t("markSeated")}</div>
        <label style={LABEL_STYLE} htmlFor="qp-seat-table">{t("selectTable")}</label>
        <div style={{ display: "flex", gap: S[2], flexWrap: "wrap" }}>
          <select
            id="qp-seat-table"
            value={seatId}
            onChange={(e) => setSeatId(e.target.value)}
            disabled={freeTables.length === 0}
            style={{ ...selectStyle, flex: 1, minWidth: 140 }}
          >
            {freeTables.length === 0 ? (
              <option value="">{t("noFreeTables")}</option>
            ) : (
              freeTables.map((tb) => (
                <option key={tb.id} value={tb.id}>
                  {t("colTable")} {tb.number}
                </option>
              ))
            )}
          </select>
          <button
            type="button"
            className="qp-press"
            disabled={!seatId}
            onClick={() => {
              if (!seatId) return;
              onMarkSeated(seatId);
              setFlash(t("seatedMarked"));
              setSeatId("");
              window.setTimeout(() => setFlash(null), 2500);
            }}
            style={{ ...btn("secondary", { size: "sm" }), minHeight: 40 }}
          >
            {t("markSeated")}
          </button>
        </div>
      </div>

      {/* Add order */}
      <div style={{ minWidth: 0 }}>
        <div style={{ ...T.body, fontSize: 15, fontWeight: 600, marginBottom: S[1] }}>{t("addOrder")}</div>
        <label style={LABEL_STYLE} htmlFor="qp-order-table">{t("selectTable")}</label>
        <div style={{ display: "flex", gap: S[2], flexWrap: "wrap", alignItems: "flex-end" }}>
          <select
            id="qp-order-table"
            value={orderTableId}
            onChange={(e) => setOrderTableId(e.target.value)}
            style={{ ...selectStyle, flex: 1, minWidth: 110 }}
          >
            {tables.map((tb) => (
              <option key={tb.id} value={tb.id}>
                {t("colTable")} {tb.number}
              </option>
            ))}
          </select>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={LABEL_STYLE} htmlFor="qp-order-item">{t("selectItem")}</label>
            <select
              id="qp-order-item"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              style={selectStyle}
            >
              {menuItems.map((mi) => (
                <option key={mi.id} value={mi.id}>
                  {name(mi.name)} · {mi.priceSar} SAR
                </option>
              ))}
            </select>
          </div>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            aria-label={t("colQty")}
            style={{ ...selectStyle, width: 64, ...MONO }}
          />
          <button
            type="button"
            className="qp-press"
            onClick={() => {
              const mi = menuItems.find((m) => m.id === itemId);
              if (!mi || !orderTableId) return;
              onAddOrder(orderTableId, mi.priceSar * qty);
              setFlash(t("orderAdded"));
              window.setTimeout(() => setFlash(null), 2500);
            }}
            style={{ ...btn("primary", { size: "sm" }), minHeight: 40 }}
          >
            {t("add")}
          </button>
        </div>
      </div>

      {flash ? (
        <div
          role="status"
          style={{
            gridColumn: "1 / -1",
            ...T.caption,
            color: STATUS.success.fg,
            background: STATUS.success.bg,
            border: `1px solid ${STATUS.success.border}`,
            borderRadius: R.sm,
            padding: `${S[2]}px ${S[3]}px`,
          }}
        >
          {flash}
        </div>
      ) : null}
    </section>
  );
}
