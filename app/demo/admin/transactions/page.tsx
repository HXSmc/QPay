"use client";

// /demo/admin/transactions: the transaction log as a page-width table (method,
// amount, tip, split, status, time) plus a payment-method mix summary. Derived
// entirely from TRANSACTIONS in _data.ts — no invented domain.

import { useMemo } from "react";
import { C, S, T, MONO, STATUS, card, badge } from "../../../lib/theme";
import { BRANCHES, TRANSACTIONS, type PaymentMethod, type SplitType } from "../../_data";
import { PageHead, useAdminDemo, tr, bi, fmtInt, fmtDec, type UIKey } from "../_shared";

const METHOD_LABEL: Record<PaymentMethod, UIKey> = {
  mada: "payMada",
  visa: "payVisa",
  applepay: "payApplePay",
  stcpay: "payStcPay",
};
const SPLIT_LABEL: Record<SplitType, UIKey> = {
  even: "splitEven",
  by_item: "splitByItem",
  full: "splitFull",
};
const TXN_STATUS: Record<"completed" | "refunded" | "pending", { key: UIKey; kind: keyof typeof STATUS }> = {
  completed: { key: "txnCompleted", kind: "success" },
  refunded: { key: "txnRefunded", kind: "danger" },
  pending: { key: "txnPending", kind: "warn" },
};

export default function TransactionsPage() {
  const { locale, branchId } = useAdminDemo();
  const t = (k: UIKey) => tr(locale, k);

  const txns = useMemo(() => {
    const filter = branchId === "all" ? null : branchId;
    return TRANSACTIONS.filter((x) => !filter || x.branchId === filter).slice().reverse();
  }, [branchId]);

  const mix = useMemo(() => {
    const byMethod = new Map<PaymentMethod, number>();
    txns.forEach((x) => byMethod.set(x.method, (byMethod.get(x.method) ?? 0) + x.amountSar));
    const total = [...byMethod.values()].reduce((a, b) => a + b, 0) || 1;
    return [...byMethod.entries()]
      .map(([method, amount]) => ({ method, amount, pct: Math.round((amount / total) * 100) }))
      .sort((a, b) => b.amount - a.amount);
  }, [txns]);

  const branchName = (id: string) => bi(locale, BRANCHES.find((b) => b.id === id)?.city ?? { en: id, ar: id });

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString(locale === "ar" ? "ar" : "en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const th = {
    ...T.caption,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: C.muted,
    textAlign: "start",
    padding: `${S[2]}px ${S[3]}px`,
    borderBottom: `1px solid ${C.border}`,
    whiteSpace: "nowrap",
  } as const;
  const td = {
    ...T.body,
    fontSize: 13.5,
    padding: `${S[3]}px`,
    borderBottom: `1px solid ${C.border}`,
    verticalAlign: "middle",
  } as const;

  return (
    <>
      <PageHead title={t("navTransactions")} />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: S[5] }} className="qp-admin-2col">
        <div style={{ ...card({ pad: S[5], radius: 14 }) }}>
          <div className="qp-scroll-x" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr>
                  <th style={th}>{t("colId")}</th>
                  <th style={th}>{t("colBranch")}</th>
                  <th style={th}>{t("colTable")}</th>
                  <th style={th}>{t("colMethod")}</th>
                  <th style={{ ...th, textAlign: "end" }}>{t("colTotal")}</th>
                  <th style={{ ...th, textAlign: "end" }}>{t("colTip")}</th>
                  <th style={th}>{t("colSplit")}</th>
                  <th style={th}>{t("colStatus")}</th>
                  <th style={th}>{t("colTime")}</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((x) => {
                  const st = TXN_STATUS[x.status];
                  return (
                    <tr key={x.id}>
                      <td style={{ ...td, ...MONO, color: C.muted, fontSize: 12.5 }}>{x.id}</td>
                      <td style={{ ...td, color: C.muted }}>{branchName(x.branchId)}</td>
                      <td style={{ ...td }}><span className="qp-count" style={MONO}>{x.tableNumber}</span></td>
                      <td style={td}>{t(METHOD_LABEL[x.method])}</td>
                      <td style={{ ...td, textAlign: "end" }}>
                        <span className="qp-count" style={{ ...MONO, fontWeight: 600 }}>{fmtDec(x.amountSar, 2)}</span>
                        <span style={{ ...T.caption, color: C.muted, marginInlineStart: 4 }}>SAR</span>
                      </td>
                      <td style={{ ...td, textAlign: "end", color: C.muted }}>
                        <span className="qp-count" style={MONO}>{fmtDec(x.tipSar, 2)}</span>
                      </td>
                      <td style={{ ...td, color: C.muted }}>{t(SPLIT_LABEL[x.splitType])}</td>
                      <td style={td}><span style={badge(st.kind)}>{t(st.key)}</span></td>
                      <td style={{ ...td, color: C.muted, whiteSpace: "nowrap" }}>{fmtTime(x.timestamp)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ ...card({ pad: S[5], radius: 14 }) }}>
          <h2 style={{ ...T.h3, margin: `0 0 ${S[4]}px` }}>{t("paymentMix")}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: S[3] }}>
            {mix.map((m) => (
              <div key={m.method}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <span>{t(METHOD_LABEL[m.method])}</span>
                  <span style={{ ...MONO, color: C.muted }}>{m.pct}% · {fmtInt(m.amount)} SAR</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: C.surfaceAlt, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${m.pct}%`, background: C.brand, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
