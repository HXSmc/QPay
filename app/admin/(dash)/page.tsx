"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BRAND,
  fmt,
  METHOD_COLOR,
  STATUS_PALETTE,
} from "../../lib/data";
import { listTables, listTransactions } from "../../lib/api";
import { downloadCsv, transactionsToCsv } from "../../lib/csv";
import type { LiveTable, Transaction } from "../../lib/types";

export default function DashboardPage() {
  const [tables, setTables] = useState<LiveTable[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  // Rendered after mount only, so the server HTML and first client render match
  // (a server-side `new Date()` would differ from the client's clock).
  const [now, setNow] = useState("");

  useEffect(() => {
    listTables().then(setTables).catch(() => {});
    listTransactions().then(setTxns).catch(() => {});
    setNow(
      new Date().toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    );
  }, []);

  const active = tables.filter((t) => t.status !== "open").length;
  const revenue = txns.reduce(
    (a, t) => a + (parseFloat(t.amount.replace(/[^0-9.]/g, "")) || 0),
    0,
  );

  // Real figures derived from the live ledger; tips and turn-time aren't tracked
  // by this prototype, so they're shown as unavailable rather than faked.
  const metrics = [
    { value: fmt(revenue), label: "Revenue (recent)", delta: `${txns.length} txns`, dc: BRAND, db: "#EEF2FF" },
    { value: `${active} / ${tables.length}`, label: "Active tables", delta: "Live", dc: BRAND, db: "#EEF2FF" },
    { value: "—", label: "Tips collected", delta: "Not tracked", dc: "#94A3B8", db: "#F1F5F9" },
    { value: "—", label: "Avg. turn time", delta: "Not tracked", dc: "#94A3B8", db: "#F1F5F9" },
  ];

  return (
    <div className="qp-page" style={{ padding: "30px 36px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 26,
        }}
      >
        <div>
          <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
            The Copper Kitchen
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#64748B",
              fontSize: 14,
              fontWeight: 600,
              marginTop: 5,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#16A34A",
                boxShadow: "0 0 0 3px rgba(22,163,74,0.18)",
              }}
            />
            Live · {now || "…"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => downloadCsv("qpay-transactions.csv", transactionsToCsv(txns))}
            style={{
              padding: "10px 16px",
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 11,
              fontFamily: "inherit",
              fontSize: 13.5,
              fontWeight: 600,
              color: "#0B1221",
              cursor: "pointer",
            }}
          >
            Export
          </button>
          <Link
            href="/admin/tables"
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
              textDecoration: "none",
            }}
          >
            + New table
          </Link>
        </div>
      </div>

      {/* Metric cards */}
      <div className="qp-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, marginBottom: 28 }}>
        {metrics.map((m) => (
          <div
            key={m.label}
            style={{
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 18,
              padding: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  background: "#EEF2FF",
                  color: BRAND,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" x2="12" y1="2" y2="22" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: m.dc,
                  background: m.db,
                  padding: "4px 9px",
                  borderRadius: 7,
                }}
              >
                {m.delta}
              </span>
            </div>
            <div style={{ fontSize: 31, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 16 }}>
              {m.value}
            </div>
            <div style={{ fontSize: 13.5, color: "#64748B", fontWeight: 600, marginTop: 2 }}>
              {m.label}
            </div>
          </div>
        ))}
      </div>

      <div className="qp-grid-2" style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 18, alignItems: "start" }}>
        {/* Live tables */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 18, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Live tables</h3>
            <Link href="/admin/tables" style={{ fontSize: 13, fontWeight: 600, color: BRAND, textDecoration: "none" }}>
              Manage
            </Link>
          </div>
          <div className="qp-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 11 }}>
            {tables.map((t) => {
              const p = STATUS_PALETTE[t.status];
              return (
                <Link
                  key={t.num}
                  href="/admin/tables"
                  style={{
                    padding: 13,
                    borderRadius: 13,
                    border: "1px solid #E2E8F0",
                    background: t.status === "open" ? "#F8FAFC" : "#fff",
                    borderLeft: "3px solid " + p.c,
                    textDecoration: "none",
                    color: "#0B1221",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>T{t.num}</span>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: p.c, display: "inline-block" }} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, marginTop: 10, letterSpacing: "-0.01em" }}>
                    {t.amount}
                  </div>
                  <div
                    style={{
                      display: "inline-block",
                      marginTop: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 6,
                      color: p.c,
                      background: p.bg,
                    }}
                  >
                    {p.label}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent transactions */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 18, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Recent transactions</h3>
            <Link href="/admin/transactions" style={{ fontSize: 13, fontWeight: 600, color: BRAND, textDecoration: "none" }}>
              View all
            </Link>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 0.6fr 0.9fr 1.1fr",
              padding: "12px 0 9px",
              fontSize: 11.5,
              fontWeight: 700,
              color: "#94A3B8",
              letterSpacing: "0.04em",
              borderBottom: "1px solid #F1F5F9",
            }}
          >
            <span>TIME</span>
            <span>TABLE</span>
            <span style={{ textAlign: "right" }}>AMOUNT</span>
            <span style={{ textAlign: "right" }}>METHOD</span>
          </div>
          {txns.slice(0, 6).map((tx, i) => {
            const m = METHOD_COLOR[tx.method] || { c: "#475569", bg: "#F1F5F9" };
            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 0.6fr 0.9fr 1.1fr",
                  alignItems: "center",
                  padding: "13px 0",
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
    </div>
  );
}
