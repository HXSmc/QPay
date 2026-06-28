"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fmt,
  METHOD_COLOR,
  STATUS_PALETTE,
} from "../../lib/data";
import { getMe, listTables, listTransactions, type Me } from "../../lib/api";
import { downloadCsv, transactionsToCsv } from "../../lib/csv";
import type { LiveTable, TableStatus, Transaction } from "../../lib/types";
import { C, R, S, T, NUM, STATUS, badge, btn, card } from "../../lib/theme";
import { Alert, EmptyState, Skeleton } from "../../components/ui/Primitives";

const STATUS_BADGE: Record<TableStatus, "danger" | "warn" | "success" | "neutral"> = {
  unpaid: "danger",
  partial: "warn",
  cleared: "success",
  open: "neutral",
};

export default function DashboardPage() {
  const [tables, setTables] = useState<LiveTable[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Rendered after mount only, so the server HTML and first client render match
  // (a server-side `new Date()` would differ from the client's clock).
  const [now, setNow] = useState("");

  useEffect(() => {
    getMe().then(setMe).catch(() => {});
    Promise.all([
      listTables().then(setTables),
      listTransactions().then(setTxns),
    ])
      .catch(() => setError(true))
      .finally(() => setLoading(false));
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

  const active = tables.filter(
    (t) => t.status === "unpaid" || t.status === "partial",
  ).length;
  const revenue = txns.reduce(
    (a, t) => a + (parseFloat(t.amount.replace(/[^0-9.]/g, "")) || 0),
    0,
  );

  // Real figures derived from the live ledger; tips and turn-time aren't tracked
  // by this prototype, so they're shown as unavailable rather than faked.
  const metrics = [
    { value: fmt(revenue), label: "Revenue (recent)", delta: `${txns.length} txns` },
    { value: `${active} / ${tables.length}`, label: "Active tables", delta: "Live" },
    { label: "Tips collected", notTracked: true as const },
    { label: "Avg. turn time", notTracked: true as const },
  ];

  return (
    <div className="qp-page" style={{ padding: `${S[6]}px ${S[6] + 4}px` }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: S[6],
        }}
      >
        <div>
          <h1 style={{ ...T.h1, margin: 0, color: C.text }}>
            {me?.email
              ? me.email.split("@")[0].replace(/^./, (c) => c.toUpperCase())
              : "Your restaurant"}
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: S[2],
              color: C.muted,
              ...T.caption,
              marginTop: S[1] + 1,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: STATUS.success.fg,
                boxShadow: "0 0 0 3px rgba(22,163,74,0.18)",
              }}
            />
            Live · {now || "..."}
          </div>
        </div>
        <div style={{ display: "flex", gap: S[2] + 2 }}>
          <button
            className="qp-cta-lift"
            onClick={() => downloadCsv("nuqra-transactions.csv", transactionsToCsv(txns))}
            style={btn("secondary", { size: "sm" })}
          >
            Export
          </button>
          <Link
            href="/admin/tables"
            className="qp-cta-lift"
            style={{ ...btn("primary", { size: "sm" }), textDecoration: "none" }}
          >
            + New table
          </Link>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: S[5] }}>
          <Alert kind="danger">
            Couldn&apos;t load your dashboard. Check your connection and refresh.
          </Alert>
        </div>
      )}

      {/* Metric cards */}
      <div
        className="qp-grid-4"
        style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: S[4] + 2, marginBottom: S[6] }}
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={card({ pad: S[5], radius: R.lg })}>
                <Skeleton h={40} w={40} radius={R.sm} />
                <Skeleton h={30} w="60%" radius={R.xs} style={{ marginTop: S[4] }} />
                <Skeleton h={14} w="80%" radius={R.xs} style={{ marginTop: S[2] }} />
              </div>
            ))
          : metrics.map((m) => (
              <div key={m.label} style={card({ pad: S[5], radius: R.lg })}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: R.sm,
                      background: C.brandTint,
                      color: C.brand,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" x2="12" y1="2" y2="22" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  {!("notTracked" in m) && (
                    <span
                      style={{
                        ...T.caption,
                        fontWeight: 700,
                        color: STATUS.info.fg,
                        background: STATUS.info.bg,
                        padding: "4px 9px",
                        borderRadius: R.xs,
                        ...NUM,
                      }}
                    >
                      {m.delta}
                    </span>
                  )}
                </div>
                {"notTracked" in m ? (
                  <div style={{ ...T.caption, color: C.faint, marginTop: S[4] + 4 }}>
                    Not tracked yet
                  </div>
                ) : (
                  <div style={{ ...T.h1, fontSize: 31, marginTop: S[4], color: C.text, ...NUM }}>
                    {m.value}
                  </div>
                )}
                <div style={{ ...T.caption, color: C.muted, marginTop: S[1] }}>
                  {m.label}
                </div>
              </div>
            ))}
      </div>

      <div className="qp-grid-2" style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: S[4] + 2, alignItems: "start" }}>
        {/* Live tables */}
        <div style={card({ pad: S[5], radius: R.lg })}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: S[5] }}>
            <h3 style={{ ...T.h3, margin: 0, color: C.text }}>Live tables</h3>
            <Link href="/admin/tables" style={{ ...T.caption, color: C.brand, textDecoration: "none" }}>
              Manage
            </Link>
          </div>
          {loading ? (
            <div className="qp-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: S[3] - 1 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} h={92} radius={R.md} />
              ))}
            </div>
          ) : tables.length === 0 ? (
            <EmptyState
              title="No tables yet"
              body="Create your first table to start taking scan-to-pay orders."
              action={
                <Link href="/admin/tables" className="qp-cta-lift" style={{ ...btn("primary", { size: "sm" }), textDecoration: "none" }}>
                  Create your first table
                </Link>
              }
            />
          ) : (
            <div className="qp-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: S[3] - 1 }}>
              {tables.map((t) => {
                const p = STATUS_PALETTE[t.status];
                return (
                  <Link
                    key={t.num}
                    href="/admin/tables"
                    style={{
                      padding: S[3] + 1,
                      borderRadius: R.md,
                      border: `1px solid ${C.border}`,
                      background: t.status === "open" ? C.surfaceAlt : C.surface,
                      borderLeft: "3px solid " + p.c,
                      textDecoration: "none",
                      color: C.text,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ ...T.caption, fontWeight: 800, ...NUM }}>T{t.num}</span>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: p.c, display: "inline-block" }} />
                    </div>
                    <div style={{ ...T.h3, marginTop: S[3] - 2, ...NUM }}>
                      {t.amount}
                    </div>
                    <div style={{ marginTop: S[2], ...badge(STATUS_BADGE[t.status]) }}>
                      {p.label}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div style={card({ pad: S[5], radius: R.lg })}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: S[1] + 2 }}>
            <h3 style={{ ...T.h3, margin: 0, color: C.text }}>Recent transactions</h3>
            <Link href="/admin/transactions" style={{ ...T.caption, color: C.brand, textDecoration: "none" }}>
              View all
            </Link>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 0.6fr 0.9fr 1.1fr",
              padding: `${S[3]}px 0 ${S[2] + 1}px`,
              ...T.caption,
              fontWeight: 700,
              color: C.muted,
              letterSpacing: "0.04em",
              borderBottom: `1px solid ${C.surfaceAlt}`,
            }}
          >
            <span>TIME</span>
            <span>TABLE</span>
            <span style={{ textAlign: "right" }}>AMOUNT</span>
            <span style={{ textAlign: "right" }}>METHOD</span>
          </div>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ padding: "13px 0", borderBottom: `1px solid ${C.surfaceAlt}` }}>
                <Skeleton h={16} w="70%" radius={R.xs} />
              </div>
            ))
          ) : txns.length === 0 ? (
            <div style={{ paddingTop: S[4] }}>
              <EmptyState
                title="No transactions yet"
                body="Payments will appear here as diners pay their bills."
              />
            </div>
          ) : (
            txns.slice(0, 6).map((tx, i) => {
              const m = METHOD_COLOR[tx.method] || { c: C.muted, bg: C.canvas };
              return (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 0.6fr 0.9fr 1.1fr",
                    alignItems: "center",
                    padding: "13px 0",
                    borderBottom: `1px solid ${C.surfaceAlt}`,
                  }}
                >
                  <span style={{ ...T.caption, color: C.muted, ...NUM }}>{tx.time}</span>
                  <span style={{ ...T.caption, fontWeight: 700, ...NUM }}>#{tx.table}</span>
                  <span style={{ ...T.body, fontWeight: 700, textAlign: "right", ...NUM }}>{tx.amount}</span>
                  <span style={{ textAlign: "right" }}>
                    <span
                      style={{
                        ...T.caption,
                        fontWeight: 700,
                        padding: "4px 9px",
                        borderRadius: R.xs,
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
            })
          )}
        </div>
      </div>
    </div>
  );
}
