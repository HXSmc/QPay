"use client";

import { useEffect, useState } from "react";
import { BRAND, STATUS_PALETTE } from "../../../lib/data";
import { createTable, listTables, setTableStatus } from "../../../lib/api";
import type { LiveTable, TableStatus } from "../../../lib/types";
import { QrModal } from "../../../components/admin/QrModal";

const CYCLE: TableStatus[] = ["open", "unpaid", "partial", "cleared"];

export default function TablesPage() {
  const [tables, setTables] = useState<LiveTable[]>([]);
  const [qrFor, setQrFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listTables().then(setTables).catch(() => {});
  }, []);

  const addTable = async () => {
    setBusy(true);
    try {
      const t = await createTable();
      setTables((prev) => [...prev, t]);
    } finally {
      setBusy(false);
    }
  };

  const cycleStatus = async (t: LiveTable) => {
    const next = CYCLE[(CYCLE.indexOf(t.status) + 1) % CYCLE.length];
    const updated = await setTableStatus(t.num, next);
    setTables((prev) => prev.map((x) => (x.num === t.num ? updated : x)));
  };

  const smallBtn = {
    flex: 1,
    padding: "7px 0",
    borderRadius: 9,
    fontFamily: "inherit",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  } as const;

  return (
    <div style={{ padding: "30px 36px" }}>
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
            Tables &amp; QR codes
          </h1>
          <p style={{ fontSize: 14, color: "#64748B", margin: "5px 0 0", fontWeight: 600 }}>
            Add tables, update status, and generate a scan-to-pay QR for each.
          </p>
        </div>
        <button
          onClick={addTable}
          disabled={busy}
          style={{
            padding: "10px 16px",
            background: BRAND,
            border: "none",
            borderRadius: 11,
            fontFamily: "inherit",
            fontSize: 13.5,
            fontWeight: 700,
            color: "#fff",
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.7 : 1,
          }}
        >
          + New table
        </button>
      </div>

      {/* legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 18, fontSize: 12.5, fontWeight: 600, color: "#64748B" }}>
        {(["unpaid", "partial", "cleared", "open"] as TableStatus[]).map((s) => (
          <span key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: STATUS_PALETTE[s].c }} />
            {STATUS_PALETTE[s].label}
          </span>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 14 }}>
        {tables.map((t) => {
          const p = STATUS_PALETTE[t.status];
          return (
            <div
              key={t.num}
              style={{
                padding: 16,
                borderRadius: 16,
                border: "1px solid #E2E8F0",
                background: t.status === "open" ? "#F8FAFC" : "#fff",
                borderLeft: "3px solid " + p.c,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 15, fontWeight: 800 }}>Table {t.num}</span>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.c, display: "inline-block" }} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 10, letterSpacing: "-0.01em" }}>
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
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button
                  onClick={() => setQrFor(t.num)}
                  style={{ ...smallBtn, background: BRAND, color: "#fff", border: "none" }}
                >
                  QR
                </button>
                <button
                  onClick={() => cycleStatus(t)}
                  style={{ ...smallBtn, background: "#fff", color: "#0B1221", border: "1.5px solid #E2E8F0" }}
                >
                  Status
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {qrFor && <QrModal tableNum={qrFor} onClose={() => setQrFor(null)} />}
    </div>
  );
}
