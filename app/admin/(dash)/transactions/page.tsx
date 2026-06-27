"use client";

import { useEffect, useState } from "react";
import { BRAND, METHOD_COLOR } from "../../../lib/data";
import { listTransactions } from "../../../lib/api";
import { downloadCsv, transactionsToCsv } from "../../../lib/csv";
import type { Transaction } from "../../../lib/types";

export default function TransactionsPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);

  useEffect(() => {
    listTransactions().then(setTxns).catch(() => {});
  }, []);

  return (
    <div className="qp-page" style={{ padding: "30px 36px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
            Transactions
          </h1>
          <p style={{ fontSize: 14, color: "#64748B", margin: "5px 0 0", fontWeight: 600 }}>
            {txns.length} payment{txns.length === 1 ? "" : "s"} recorded.
          </p>
        </div>
        <button
          onClick={() => downloadCsv("qpay-transactions.csv", transactionsToCsv(txns))}
          style={{
            padding: "10px 16px",
            background: BRAND,
            border: "none",
            borderRadius: 11,
            fontFamily: "inherit",
            fontSize: 13.5,
            fontWeight: 700,
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Export CSV
        </button>
      </div>

      <div className="qp-scroll-x" style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 18, padding: 22 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 0.6fr 0.9fr 1.1fr",
            padding: "0 0 12px",
            fontSize: 11.5,
            fontWeight: 700,
            color: "#64748B",
            letterSpacing: "0.04em",
            borderBottom: "1px solid #F1F5F9",
          }}
        >
          <span>TIME</span>
          <span>TABLE</span>
          <span style={{ textAlign: "right" }}>AMOUNT</span>
          <span style={{ textAlign: "right" }}>METHOD</span>
        </div>
        {txns.map((tx, i) => {
          const m = METHOD_COLOR[tx.method] || { c: "#475569", bg: "#F1F5F9" };
          return (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 0.6fr 0.9fr 1.1fr",
                alignItems: "center",
                padding: "14px 0",
                borderBottom: "1px solid #F1F5F9",
              }}
            >
              <span style={{ fontSize: 13.5, color: "#475569", fontWeight: 600 }}>{tx.time}</span>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>#{tx.table}</span>
              <span style={{ fontSize: 14, fontWeight: 700, textAlign: "right" }}>{tx.amount}</span>
              <span style={{ textAlign: "right" }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "4px 9px",
                    borderRadius: 7,
                    color: m.c,
                    background: m.bg,
                    whiteSpace: "nowrap",
                  }}
                >
                  {tx.method}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
