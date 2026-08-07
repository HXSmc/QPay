"use client";

// /demo/admin/tables: the floor panel promoted to a page. Live table grid for
// the scoped branch (or all branches), plus a one-line occupancy summary.

import { useMemo } from "react";
import { C, S, T, MONO, card } from "../../../lib/theme";
import { TABLES } from "../../_data";
import {
  FloorGrid,
  PageHead,
  useAdminDemo,
  tr,
  OCCUPIED,
  type UIKey,
} from "../_shared";

export default function TablesPage() {
  const { locale, branchId } = useAdminDemo();
  const t = (k: UIKey) => tr(locale, k);

  const tables = useMemo(() => {
    const filter = branchId === "all" ? null : branchId;
    return TABLES.filter((tb) => !filter || tb.branchId === filter);
  }, [branchId]);

  const occupied = tables.filter((tb) => OCCUPIED.includes(tb.state)).length;
  const free = tables.filter((tb) => tb.state === "available").length;

  const stats = [
    { label: t("flSeated"), value: String(occupied) },
    { label: t("flAvailable"), value: String(free) },
    { label: t("colTables"), value: String(tables.length) },
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

      <div style={{ ...card({ pad: S[5], radius: 14 }) }}>
        <FloorGrid locale={locale} tables={tables} />
      </div>
    </>
  );
}
