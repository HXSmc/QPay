"use client";

// /demo/admin/analytics: the revenue-trend panel promoted to a page. Full 14-day
// pilot series (not just 7), plus a KPI row of the latest-day figures. Derived
// from ANALYTICS_DHAHRAN (the pilot branch's daily timeseries).

import { C, S, T, MONO, card } from "../../../lib/theme";
import { ANALYTICS_DHAHRAN } from "../../_data";
import { PageHead, RevenueChart, useAdminDemo, tr, fmtInt, fmtDec, type UIKey } from "../_shared";

export default function AnalyticsPage() {
  const { locale } = useAdminDemo();
  const t = (k: UIKey) => tr(locale, k);

  const series = ANALYTICS_DHAHRAN;
  const today = series[series.length - 1];

  const tiles = [
    { label: t("colRevenue"), value: fmtInt(today.revenueSar), unit: "SAR", accent: true },
    { label: t("colOrders"), value: fmtInt(today.orders), unit: "" },
    { label: t("colAvgTicket"), value: fmtDec(today.avgTicketSar, 1), unit: "SAR" },
    { label: t("colAvgTurn"), value: fmtDec(today.avgTurnMinutes, 0), unit: locale === "ar" ? "د" : "min" },
  ];

  return (
    <>
      <PageHead title={t("revenueTrend")} sub={`${t("last14")} · ${t("pilot")}`} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: S[4] }}>
        {tiles.map((tile) => (
          <div key={tile.label} style={{ ...card({ pad: S[4], radius: 14 }) }}>
            <div style={{ ...T.caption, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{tile.label}</div>
            <div style={{ marginTop: 6 }}>
              <span className="qp-count" style={{ ...MONO, fontWeight: 600, fontSize: 24, color: tile.accent ? C.brand : C.text }}>{tile.value}</span>
              {tile.unit ? <span style={{ ...T.caption, color: C.muted, marginInlineStart: 4 }}>{tile.unit}</span> : null}
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...card({ pad: S[5], radius: 14 }), marginTop: S[5] }}>
        <h2 style={{ ...T.h3, margin: `0 0 ${S[4]}px` }}>{t("analyticsBreakdown")}</h2>
        <RevenueChart locale={locale} series={series} />
      </div>
    </>
  );
}
