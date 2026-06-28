"use client";

import { useEffect, useState } from "react";
import { fmt } from "../../../lib/data";
import { listTransactions } from "../../../lib/api";
import type { Transaction } from "../../../lib/types";
import { C, R, S, T, NUM, card } from "../../../lib/theme";
import { Alert, EmptyState, Skeleton } from "../../../components/ui/Primitives";

const amountOf = (t: Transaction) =>
  parseFloat(t.amount.replace(/[^0-9.]/g, "")) || 0;

export default function AnalyticsPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    listTransactions()
      .then(setTxns)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const revenue = txns.reduce((a, t) => a + amountOf(t), 0);
  const count = txns.length;
  const avg = count ? revenue / count : 0;

  const STATS = [
    { label: "Revenue (recent)", value: fmt(revenue) },
    { label: "Transactions", value: String(count) },
    { label: "Avg. ticket", value: fmt(avg) },
    { label: "Tips rate", notTracked: true as const },
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
    <div className="qp-page" style={{ padding: `${S[6]}px ${S[6] + 4}px` }}>
      <h1 style={{ ...T.h1, margin: 0, color: C.text }}>
        Analytics
      </h1>
      <p style={{ ...T.body, color: C.muted, margin: `${S[1] + 1}px 0 ${S[5]}px` }}>
        Revenue and payment trends from your live ledger.
      </p>

      {error && (
        <div style={{ marginBottom: S[4] }}>
          <Alert kind="danger">Couldn&apos;t load analytics. Please refresh.</Alert>
        </div>
      )}

      <div className="qp-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: S[4] + 2, marginBottom: S[5] }}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={card({ pad: S[5], radius: R.lg })}>
                <Skeleton h={28} w="55%" radius={R.xs} />
                <Skeleton h={14} w="75%" radius={R.xs} style={{ marginTop: S[3] }} />
              </div>
            ))
          : STATS.map((s) => (
              <div key={s.label} style={card({ pad: S[5], radius: R.lg })}>
                {"notTracked" in s ? (
                  <div style={{ ...T.h3, color: C.faint }}>Not tracked yet</div>
                ) : (
                  <div style={{ ...T.h1, fontSize: 28, color: C.text, ...NUM }}>{s.value}</div>
                )}
                <div style={{ ...T.caption, color: C.muted, marginTop: S[1] }}>{s.label}</div>
              </div>
            ))}
      </div>

      <div style={card({ pad: S[5], radius: R.lg })}>
        <h3 style={{ ...T.h3, margin: `0 0 ${S[5]}px`, color: C.text }}>Revenue by payment method</h3>
        {loading ? (
          <div style={{ display: "flex", alignItems: "flex-end", gap: S[4], height: 200 }}>
            {[60, 90, 45, 75].map((h, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                <Skeleton h={`${h}%`} radius={R.xs} style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }} />
              </div>
            ))}
          </div>
        ) : methods.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            body="As diners pay, this chart breaks revenue down by payment method."
          />
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: S[4], height: 200 }}>
            {methods.map((m) => (
              <div key={m.method} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: S[2] }}>
                <div style={{ ...T.caption, fontWeight: 700, color: C.muted, ...NUM }}>{fmt(m.sum)}</div>
                <div
                  style={{
                    width: "100%",
                    height: `${maxSum ? (m.sum / maxSum) * 100 : 0}%`,
                    background: `linear-gradient(180deg, ${C.brand}, ${C.brandLight})`,
                    borderRadius: `${R.xs}px ${R.xs}px 0 0`,
                    minHeight: 6,
                  }}
                />
                <span style={{ ...T.caption, color: C.muted }}>{m.method}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
