"use client";

import { useState } from "react";
import { BRAND, fmt } from "../../lib/data";
import { setTableItems } from "../../lib/api";
import type { LiveTable, OrderItem } from "../../lib/types";

export function OrderModal({
  table,
  onClose,
  onSaved,
}: {
  table: LiveTable;
  onClose: () => void;
  onSaved: (t: LiveTable) => void;
}) {
  const [items, setItems] = useState<OrderItem[]>(
    (table.items ?? []).map((i) => ({ ...i })),
  );
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState("");
  const [busy, setBusy] = useState(false);

  const subtotal = items.reduce((a, it) => a + it.price, 0);

  const addLine = () => {
    const u = Number(unit);
    if (!name.trim() || qty < 1 || !(u >= 0)) return;
    setItems((prev) => [
      ...prev,
      { name: name.trim(), qty, price: +(u * qty).toFixed(2) },
    ]);
    setName("");
    setQty(1);
    setUnit("");
  };

  const removeLine = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));

  const save = async (next: OrderItem[]) => {
    setBusy(true);
    try {
      const updated = await setTableItems(table.num, next);
      onSaved(updated);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const field = {
    padding: "10px 12px",
    border: "1.5px solid #E2E8F0",
    borderRadius: 10,
    fontFamily: "inherit",
    fontSize: 14,
    outline: "none",
    color: "#0B1221",
    background: "#fff",
  } as const;

  const stepBtn = {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: "1.5px solid #E2E8F0",
    background: "#fff",
    color: BRAND,
    fontFamily: "inherit",
    fontSize: 17,
    fontWeight: 700,
    cursor: "pointer",
    lineHeight: 1,
  } as const;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(11,18,33,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 440,
          maxHeight: "88vh",
          background: "#fff",
          borderRadius: 22,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 30px 70px rgba(11,18,33,0.4)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 20px",
            borderBottom: "1px solid #E2E8F0",
          }}
        >
          <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>
            Table {table.num} order
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none",
              background: "#F1F5F9",
              borderRadius: 9,
              width: 32,
              height: 32,
              cursor: "pointer",
              color: "#475569",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 20, overflow: "auto" }}>
          {/* current lines */}
          {items.length === 0 ? (
            <div
              style={{
                padding: "20px 0",
                textAlign: "center",
                color: "#94A3B8",
                fontSize: 13.5,
                fontWeight: 600,
              }}
            >
              No items yet — add the first line below.
            </div>
          ) : (
            items.map((it, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid #F1F5F9",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      minWidth: 24,
                      height: 24,
                      padding: "0 6px",
                      borderRadius: 7,
                      background: "#EEF2FF",
                      color: BRAND,
                      fontSize: 12.5,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {it.qty}
                  </span>
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>{it.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>
                    {fmt(it.price)}
                  </span>
                  <button
                    onClick={() => removeLine(i)}
                    aria-label="Remove"
                    style={{
                      border: "none",
                      background: "#FEF2F2",
                      color: "#DC2626",
                      borderRadius: 8,
                      width: 26,
                      height: 26,
                      cursor: "pointer",
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}

          {items.length > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px 0 4px",
                fontSize: 14.5,
                fontWeight: 800,
              }}
            >
              <span>Subtotal</span>
              <span style={{ color: BRAND }}>{fmt(subtotal)}</span>
            </div>
          )}

          {/* add line */}
          <div
            style={{
              marginTop: 14,
              padding: 14,
              background: "#F8FAFC",
              borderRadius: 14,
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#64748B", marginBottom: 10 }}>
              Add item
            </div>
            <input
              placeholder="Item name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addLine()}
              style={{ ...field, width: "100%", marginBottom: 10 }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={stepBtn}>
                  −
                </button>
                <span style={{ fontSize: 15, fontWeight: 800, minWidth: 18, textAlign: "center" }}>
                  {qty}
                </span>
                <button onClick={() => setQty((q) => q + 1)} style={stepBtn}>
                  +
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#64748B" }}>$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="unit price"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addLine()}
                  style={{ ...field, flex: 1, width: "100%" }}
                />
              </div>
              <button
                onClick={addLine}
                style={{
                  padding: "10px 16px",
                  background: BRAND,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontFamily: "inherit",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            display: "flex",
            gap: 10,
            padding: "16px 20px",
            borderTop: "1px solid #E2E8F0",
          }}
        >
          <button
            onClick={() => save([])}
            disabled={busy || (table.items?.length ?? 0) === 0}
            style={{
              padding: "12px 16px",
              background: "#fff",
              color: "#DC2626",
              border: "1.5px solid #FECACA",
              borderRadius: 12,
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 700,
              cursor: busy || (table.items?.length ?? 0) === 0 ? "default" : "pointer",
              opacity: (table.items?.length ?? 0) === 0 ? 0.5 : 1,
            }}
          >
            Clear table
          </button>
          <button
            onClick={() => save(items)}
            disabled={busy}
            style={{
              flex: 1,
              padding: "12px 16px",
              background: BRAND,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontFamily: "inherit",
              fontSize: 14.5,
              fontWeight: 700,
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? "Saving…" : "Save order"}
          </button>
        </div>
      </div>
    </div>
  );
}
