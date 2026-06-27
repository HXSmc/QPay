"use client";

import { useEffect, useState } from "react";
import { BRAND, fmt } from "../../../lib/data";
import { listTransactions } from "../../../lib/api";
import type { Transaction } from "../../../lib/types";

const amountOf = (t: Transaction) =>
  parseFloat(t.amount.replace(/[^0-9.]/g, "")) || 0;

export default function AnalyticsPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);

  useEffect(() => {
    listTransactions().then(setTxns).catch(() => {});
  }, []);

  const revenue = txns.reduce((a, t) => a + amountOf(t), 0);
  const count = txns.length;
  const avg = count ? revenue / count : 0;

  const STATS = [
    { label: "Revenue (recent)", value: fmt(revenue) },
    { label: "Transactions", value: String(count) },
    { label: "Avg. ticket", value: fmt(avg) },
    { label: "Tips rate", value: "—", note: "Not tracked" },
  ];

  // Group revenue by payment method for a real, honest bar chart.
  const byMethod = new Map<string, number>();
  for (const t of txns) {
    byMethod.set(t.method, (byMethod.get(t.method) ?? 0) + amountOf(t));
  }
  const methods = Array.from(byMethod.entries()).map(([method, sum]) => ({
    method,
    sum,
  }));
  const maxSum = methods.reduce((m, x) => Math.max(m, x.sum), 0);

  return (
    <div className="qp-page" style={{ padding: "30px 36px" }}>
      <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
        Analytics
      </h1>
      <p style={{ fontSize: 14, color: "#64748B", margin: "5px 0 24px", fontWeight: 600 }}>
        Revenue and payment trends from your live ledger.
      </p>

      <div className="qp-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, marginBottom: 24 }}>
        {STATS.map((s) => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 18, padding: 20 }}>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>{s.value}</div>
            <div style={{ fontSize: 13.5, color: "#64748B", fontWeight: 600, marginTop: 4 }}>{s.label}</div>
            {s.note && (
              <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginTop: 2 }}>{s.note}</div>
            )}
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 18, padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 20px" }}>Revenue by payment method</h3>
        {methods.length === 0 ? (
          <div style={{ fontSize: 13.5, color: "#64748B", fontWeight: 600, padding: "8px 0" }}>
            No transactions yet.
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 200 }}>
            {methods.map((m) => (
              <div key={m.method} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>{fmt(m.sum)}</div>
                <div
                  style={{
                    width: "100%",
                    height: `${maxSum ? (m.sum / maxSum) * 100 : 0}%`,
                    background: `linear-gradient(180deg, ${BRAND}, #5B7BFF)`,
                    borderRadius: "8px 8px 0 0",
                    minHeight: 6,
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>{m.method}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
