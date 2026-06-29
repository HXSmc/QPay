"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fmt, type Currency } from "../../lib/data";
import { getMe, getSettings, listTables, listTransactions, type Me } from "../../lib/api";
import { downloadCsv, transactionsToCsv } from "../../lib/csv";
import type { LiveTable, TableStatus, Transaction } from "../../lib/types";
import { C, R, S, T, NUM, MONO, STATUS, SHADOW, badge, btn, card } from "../../lib/theme";
import { Alert, EmptyState, Skeleton } from "../../components/ui/Primitives";
import { useT } from "../../lib/i18n-client";

const STATUS_BADGE: Record<TableStatus, "danger" | "warn" | "success" | "neutral"> = {
  unpaid: "danger",
  partial: "warn",
  cleared: "success",
  open: "neutral",
};

const STATUS_LABEL: Record<TableStatus, string> = {
  unpaid: "Unpaid",
  partial: "Partial",
  cleared: "Cleared",
  open: "Open",
};

export default function DashboardPage() {
  const tr = useT();
  const [tables, setTables] = useState<LiveTable[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Rendered after mount only, so the server HTML and first client render match
  // (a server-side `new Date()` would differ from the client's clock).
  const [now, setNow] = useState("");

  useEffect(() => {
    getMe().then(setMe).catch(() => {});
    getSettings().then((s) => setCurrency(s.currency)).catch(() => {});
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
    { value: fmt(revenue, currency), label: "Revenue (recent)", delta: `${txns.length} ${tr("txns")}`, money: true as const },
    { value: `${active} / ${tables.length}`, label: "Active tables", delta: tr("Live") },
    { label: "Tips collected", notTracked: true as const },
    { label: "Avg. turn time", notTracked: true as const },
  ];

  return (
    <div className="qp-page" style={{ padding: `${S[6]}px ${S[6] + 4}px` }}>
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: S[4],
          marginBottom: S[6],
        }}
      >
        <div>
          <div style={{ ...T.label, color: C.brand, marginBottom: S[1] }}>
            {tr("Dashboard")}
          </div>
          <h1 style={{ ...T.h1, margin: 0, color: C.text }}>
            {me?.email
              ? me.email.split("@")[0].replace(/^./, (c) => c.toUpperCase())
              : tr("Your restaurant")}
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: S[2],
              color: C.muted,
              ...T.caption,
              marginTop: S[2],
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: R.pill,
                background: STATUS.success.fg,
                boxShadow: `0 0 0 3px ${STATUS.success.bg}`,
              }}
            />
            {tr("Live")}, {now || "..."}
          </div>
        </div>
        <div style={{ display: "flex", gap: S[2] + 2 }}>
          <button
            className="qp-cta-lift"
            onClick={() => downloadCsv("nuqra-transactions.csv", transactionsToCsv(txns))}
            style={btn("secondary", { size: "sm" })}
          >
            {tr("Export")}
          </button>
          <Link
            href="/admin/tables"
            className="qp-cta-lift"
            style={{ ...btn("primary", { size: "sm" }), textDecoration: "none" }}
          >
            {tr("+ New table")}
          </Link>
        </div>
      </header>

      {error && (
        <div style={{ marginBottom: S[5] }}>
          <Alert kind="danger">
            {tr("Couldn't load your dashboard. Check your connection and refresh.")}
          </Alert>
        </div>
      )}

      {/* Metric row - revenue featured */}
      <div
        className="qp-grid-4"
        style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: S[4], marginBottom: S[6] }}
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={card({ pad: S[5], radius: R.lg })}>
                <Skeleton h={14} w="55%" radius={R.xs} />
                <Skeleton h={28} w="70%" radius={R.xs} style={{ marginTop: S[4] }} />
              </div>
            ))
          : metrics.map((m, i) => {
              const featured = i === 0;
              const tracked = !("notTracked" in m);
              return (
                <div
                  key={m.label}
                  style={{
                    ...card({ pad: S[5], radius: R.lg }),
                    ...(featured
                      ? { background: C.ink, border: `1px solid ${C.inkSoft}`, boxShadow: SHADOW.e1 }
                      : {}),
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: 134,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: S[2],
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: S[2] + 2 }}>
                      {featured && (
                        <span
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: R.sm,
                            background: C.brand,
                            color: "#fff",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" x2="12" y1="2" y2="22" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                          </svg>
                        </span>
                      )}
                      <span style={{ ...T.label, color: featured ? "#fff" : C.muted }}>
                        {tr(m.label)}
                      </span>
                    </div>
                    {tracked && m.delta && (
                      <span
                        style={{
                          ...T.caption,
                          fontWeight: 700,
                          color: featured ? "#fff" : C.brand,
                          background: featured ? C.inkSoft : C.brandTint,
                          padding: "4px 9px",
                          borderRadius: R.pill,
                          whiteSpace: "nowrap",
                          ...NUM,
                        }}
                      >
                        {m.delta}
                      </span>
                    )}
                  </div>
                  <div style={{ marginTop: S[4] }}>
                    {tracked ? (
                      <div
                        style={{
                          ...T.h1,
                          fontSize: 31,
                          color: featured ? "#fff" : C.text,
                          ...("money" in m ? MONO : NUM),
                        }}
                      >
                        {m.value}
                      </div>
                    ) : (
                      <div style={{ ...T.h2, color: C.muted }}>{tr("Not tracked yet")}</div>
                    )}
                  </div>
                </div>
              );
            })}
      </div>

      <div
        className="qp-grid-2"
        style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: S[4] + 2, alignItems: "start" }}
      >
        {/* Live tables */}
        <section style={card({ pad: S[5], radius: R.lg })}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: S[2],
              marginBottom: S[5],
            }}
          >
            <h2 style={{ ...T.h3, margin: 0, color: C.text }}>{tr("Live tables")}</h2>
            <Link
              href="/admin/tables"
              className="qp-nav"
              style={{ ...T.caption, fontWeight: 600, color: C.brand, textDecoration: "none" }}
            >
              {tr("Manage")}
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
              title={tr("No tables yet")}
              body={tr("Create your first table to start taking scan-to-pay orders.")}
              action={
                <Link href="/admin/tables" className="qp-cta-lift" style={{ ...btn("primary", { size: "sm" }), textDecoration: "none" }}>
                  {tr("Create your first table")}
                </Link>
              }
            />
          ) : (
            <div className="qp-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: S[3] - 1 }}>
              {tables.map((t) => {
                const dot = STATUS[STATUS_BADGE[t.status]].fg;
                return (
                  <Link
                    key={t.num}
                    href="/admin/tables"
                    className="qp-press"
                    style={{
                      padding: S[3] + 1,
                      borderRadius: R.md,
                      border: `1px solid ${C.border}`,
                      background: t.status === "open" ? C.surfaceAlt : C.surface,
                      borderLeft: "3px solid " + dot,
                      textDecoration: "none",
                      color: C.text,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ ...T.caption, fontWeight: 800, ...NUM }}>T{t.num}</span>
                      <span style={{ width: 9, height: 9, borderRadius: R.pill, background: dot, display: "inline-block" }} />
                    </div>
                    <div style={{ ...T.h3, marginTop: S[3] - 2, ...MONO }}>
                      {t.amount}
                    </div>
                    <div style={{ marginTop: S[2], ...badge(STATUS_BADGE[t.status]) }}>
                      {tr(STATUS_LABEL[t.status])}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent transactions */}
        <section style={card({ pad: S[5], radius: R.lg })}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: S[2],
              marginBottom: S[1] + 2,
            }}
          >
            <h2 style={{ ...T.h3, margin: 0, color: C.text }}>{tr("Recent transactions")}</h2>
            <Link
              href="/admin/transactions"
              className="qp-nav"
              style={{ ...T.caption, fontWeight: 600, color: C.brand, textDecoration: "none" }}
            >
              {tr("View all")}
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
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <span>{tr("TIME")}</span>
            <span>{tr("TABLE")}</span>
            <span style={{ textAlign: "end" }}>{tr("AMOUNT")}</span>
            <span style={{ textAlign: "end" }}>{tr("METHOD")}</span>
          </div>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ padding: "13px 0", borderBottom: `1px solid ${C.border}` }}>
                <Skeleton h={16} w="70%" radius={R.xs} />
              </div>
            ))
          ) : txns.length === 0 ? (
            <div style={{ paddingTop: S[4] }}>
              <EmptyState
                title={tr("No transactions yet")}
                body={tr("Payments will appear here as diners pay their bills.")}
              />
            </div>
          ) : (
            txns.slice(0, 6).map((tx, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 0.6fr 0.9fr 1.1fr",
                  alignItems: "center",
                  padding: "13px 0",
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <span style={{ ...T.caption, color: C.muted, ...NUM }}>{tx.time}</span>
                <span style={{ ...T.caption, fontWeight: 700, ...NUM }}>#{tx.table}</span>
                <span style={{ ...T.body, fontWeight: 700, textAlign: "end", ...MONO }}>{tx.amount}</span>
                <span style={{ textAlign: "end" }}>
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
        </section>
      </div>
    </div>
  );
}
