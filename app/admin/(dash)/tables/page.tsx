"use client";

import { useEffect, useState } from "react";
import { billDue, BRAND, fmt, STATUS_PALETTE } from "../../../lib/data";
import {
  createTable,
  deleteTable,
  listTables,
  setTableItems,
} from "../../../lib/api";
import type { LiveTable, TableStatus } from "../../../lib/types";
import { QrModal } from "../../../components/admin/QrModal";
import { OrderModal } from "../../../components/admin/OrderModal";

export default function TablesPage() {
  const [tables, setTables] = useState<LiveTable[]>([]);
  const [qrFor, setQrFor] = useState<string | null>(null);
  const [orderFor, setOrderFor] = useState<LiveTable | null>(null);
  const [busy, setBusy] = useState(false);

  const applyTable = (t: LiveTable) =>
    setTables((prev) => prev.map((x) => (x.num === t.num ? t : x)));

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

  const clearTable = async (t: LiveTable) => {
    const updated = await setTableItems(t.num, []);
    applyTable(updated);
  };

  const removeTable = async (t: LiveTable) => {
    if (!confirm(`Delete Table ${t.num}? This can't be undone.`)) return;
    try {
      await deleteTable(t.num);
      setTables((prev) => prev.filter((x) => x.num !== t.num));
    } catch {
      // Keep the row if the delete failed (e.g. session expired) rather than
      // dropping an unhandled rejection and lying about the table being gone.
      alert(`Couldn't delete Table ${t.num}. Please retry.`);
    }
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
            Tables &amp; QR codes
          </h1>
          <p style={{ fontSize: 14, color: "#64748B", margin: "5px 0 0", fontWeight: 600 }}>
            Add tables, generate a scan-to-pay QR, then clear or delete when done.
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
              {t.status === "partial" && (
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "#64748B", marginTop: 7 }}>
                  Paid {fmt(t.paid)} of {fmt(billDue(t.items))}
                </div>
              )}
              <button
                onClick={() => setOrderFor(t)}
                style={{
                  width: "100%",
                  marginTop: 14,
                  padding: "8px 0",
                  borderRadius: 9,
                  fontFamily: "inherit",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: "#EEF2FF",
                  color: BRAND,
                  border: "1.5px solid #DBE3F4",
                }}
              >
                {t.items?.length ? `Order · ${t.items.length}` : "Add order"}
              </button>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => setQrFor(t.num)}
                  style={{ ...smallBtn, background: BRAND, color: "#fff", border: "none" }}
                >
                  QR
                </button>
                <button
                  onClick={() => removeTable(t)}
                  style={{ ...smallBtn, background: "#fff", color: "#DC2626", border: "1.5px solid #FECACA" }}
                >
                  Delete
                </button>
              </div>
              {t.status === "cleared" && (
                <button
                  onClick={() => clearTable(t)}
                  style={{
                    width: "100%",
                    marginTop: 8,
                    padding: "8px 0",
                    borderRadius: 9,
                    fontFamily: "inherit",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    background: "#16A34A",
                    color: "#fff",
                    border: "none",
                  }}
                >
                  Clear table
                </button>
              )}
            </div>
          );
        })}
      </div>

      {qrFor && <QrModal tableNum={qrFor} onClose={() => setQrFor(null)} />}
      {orderFor && (
        <OrderModal
          table={orderFor}
          onClose={() => setOrderFor(null)}
          onSaved={applyTable}
        />
      )}
    </div>
  );
}
