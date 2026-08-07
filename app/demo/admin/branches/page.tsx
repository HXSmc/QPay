"use client";

// /demo/admin/branches: the branch-comparison panel promoted to a page. The
// cross-branch table on top, then one detail card per branch (address, tier,
// tables, MTD revenue, turns, avg tip) derived from BRANCHES + BRANCH_SUMMARIES.

import { C, S, T, MONO, card, badge } from "../../../lib/theme";
import { BRANCHES, BRANCH_SUMMARIES } from "../../_data";
import { BranchTable, PageHead, useAdminDemo, tr, bi, fmtInt, fmtDec, type UIKey } from "../_shared";

export default function BranchesPage() {
  const { locale, branchId } = useAdminDemo();
  const t = (k: UIKey) => tr(locale, k);

  return (
    <>
      <PageHead title={t("branchCompare")} />

      <div style={{ ...card({ pad: S[5], radius: 14 }) }}>
        <BranchTable locale={locale} selected={branchId} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: S[5],
          marginTop: S[5],
        }}
      >
        {BRANCHES.map((b) => {
          const sum = BRANCH_SUMMARIES.find((s) => s.branchId === b.id);
          return (
            <div key={b.id} style={{ ...card({ pad: S[5], radius: 14 }) }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: S[2] }}>
                <h3 style={{ ...T.h3, margin: 0 }}>{bi(locale, b.name)}</h3>
                <span style={{ ...badge(b.tier === "Scale" ? "success" : "neutral"), textTransform: "none", letterSpacing: 0 }}>
                  {b.tier}
                </span>
              </div>
              <div style={{ ...T.caption, color: C.muted, marginTop: 4 }}>{bi(locale, b.address)}</div>
              {b.isPilot ? (
                <div style={{ ...T.caption, color: C.brand, marginTop: 2 }}>{t("pilot")}</div>
              ) : null}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: S[3], marginTop: S[4] }}>
                <Metric label={t("colTables")} value={String(b.tableCount)} />
                <Metric label={t("colRevenue")} value={sum ? fmtInt(sum.revenueMtdSar) : "-"} unit="SAR" />
                <Metric label={t("colTurns")} value={sum ? fmtDec(sum.tableTurnsToday, 1) : "-"} />
                <Metric label={t("colTip")} value={sum ? fmtDec(sum.avgTipPct, 1) : "-"} unit="%" />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <div style={{ ...T.caption, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ marginTop: 2 }}>
        <span className="qp-count" style={{ ...MONO, fontWeight: 600, fontSize: 17 }}>{value}</span>
        {unit ? <span style={{ ...T.caption, color: C.muted, marginInlineStart: 4 }}>{unit}</span> : null}
      </div>
    </div>
  );
}
