"use client";

import { useEffect, useState } from "react";
import { listTransactions } from "../../../lib/api";
import { downloadCsv, transactionsToCsv } from "../../../lib/csv";
import type { Transaction } from "../../../lib/types";
import { C, R, S, T, NUM, MONO, btn, card } from "../../../lib/theme";
import { Alert, EmptyState, Skeleton } from "../../../components/ui/Primitives";

export default function TransactionsPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    listTransactions()
      .then(setTxns)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const colTemplate = "1fr 0.6fr 0.9fr 1.1fr";

  return (
    <div className="qp-page" style={{ padding: `${S[6]}px ${S[6] + 4}px` }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: S[5],
        }}
      >
        <div>
          <div style={{ ...T.label, color: C.brand, marginBottom: S[1] }}>
            Ledger
          </div>
          <h1 style={{ ...T.h1, margin: 0, color: C.text }}>
            Transactions
          </h1>
          <p style={{ ...T.body, color: C.muted, margin: `${S[2]}px 0 0` }}>
            <span style={{ ...NUM }}>{txns.length}</span> payment{txns.length === 1 ? "" : "s"} recorded.
          </p>
        </div>
        <button
          className="qp-cta-lift"
          onClick={() => downloadCsv("nuqra-transactions.csv", transactionsToCsv(txns))}
          disabled={loading}
          style={btn("primary", { size: "sm", disabled: loading })}
        >
          Export CSV
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: S[4] }}>
          <Alert kind="danger">Couldn&apos;t load transactions. Please refresh.</Alert>
        </div>
      )}

      <div className="qp-scroll-x" style={card({ pad: S[5], radius: R.lg })}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: colTemplate,
            padding: `0 0 ${S[3]}px`,
            ...T.caption,
            fontWeight: 700,
            color: C.muted,
            letterSpacing: "0.04em",
            borderBottom: `1px solid ${C.border}`,
            minWidth: 420,
          }}
        >
          <span>TIME</span>
          <span>TABLE</span>
          <span style={{ textAlign: "right" }}>AMOUNT</span>
          <span style={{ textAlign: "right" }}>METHOD</span>
        </div>

        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ padding: "14px 0", borderBottom: `1px solid ${C.border}`, minWidth: 420 }}>
              <Skeleton h={16} w="80%" radius={R.xs} />
            </div>
          ))
        ) : txns.length === 0 ? (
          <div style={{ paddingTop: S[5] }}>
            <EmptyState
              title="No transactions yet"
              body="Once diners scan a table QR and pay, their payments show up here."
            />
          </div>
        ) : (
          txns.map((tx, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: colTemplate,
                alignItems: "center",
                padding: "14px 0",
                borderBottom: `1px solid ${C.border}`,
                minWidth: 420,
              }}
            >
              <span style={{ ...T.body, color: C.muted, ...NUM }}>{tx.time}</span>
              <span style={{ ...T.body, fontWeight: 700, ...NUM }}>#{tx.table}</span>
              <span style={{ ...T.body, fontWeight: 700, textAlign: "right", ...MONO }}>{tx.amount}</span>
              <span style={{ textAlign: "right" }}>
                <span
                  style={{
                    ...T.caption,
                    fontWeight: 600,
                    padding: "4px 9px",
                    borderRadius: R.pill,
                    color: C.muted,
                    background: C.surfaceAlt,
                    border: `1px solid ${C.border}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {tx.method}
                </span>
              </span>
            </div>
          ))
        )}
      </div>

      {!loading && txns.length > 0 && (
        <p style={{ ...T.caption, color: C.faint, marginTop: S[3], textAlign: "center" }}>
          On smaller screens, scroll the table sideways to see every column.
        </p>
      )}
    </div>
  );
}
