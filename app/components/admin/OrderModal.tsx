"use client";

import { useEffect, useRef, useState } from "react";
import { fmt } from "../../lib/data";
import { setTableItems } from "../../lib/api";
import type { LiveTable, OrderItem } from "../../lib/types";
import { C, R, S, T, NUM, btn, field as fieldStyle } from "../../lib/theme";
import { Alert, Spinner } from "../ui/Primitives";

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
  const [err, setErr] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const subtotal = items.reduce((a, it) => a + it.price, 0);

  // Inline validation for the add-line row.
  const trimmed = name.trim();
  const u = Number(unit);
  const priceOk = unit.trim() === "" || (Number.isFinite(u) && u >= 0);
  const canAdd = trimmed.length > 0 && qty >= 1 && priceOk;
  const touched = trimmed.length > 0 || unit.trim() !== "";
  const validationMsg = !trimmed
    ? "Enter an item name."
    : !priceOk
      ? "Price can't be negative."
      : "";

  const addLine = () => {
    const v = Number(unit);
    if (!name.trim() || qty < 1 || !(v >= 0)) return;
    setItems((prev) => [
      ...prev,
      { name: name.trim(), qty, price: +(v * qty).toFixed(2) },
    ]);
    setName("");
    setQty(1);
    setUnit("");
  };

  const removeLine = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));

  const save = async (next: OrderItem[]) => {
    setBusy(true);
    setErr("");
    try {
      const updated = await setTableItems(table.num, next);
      onSaved(updated);
      onClose();
    } catch {
      setErr("Couldn't save the order. Please retry.");
    } finally {
      setBusy(false);
    }
  };

  const field = {
    ...fieldStyle(),
    padding: "10px 12px",
    borderRadius: R.sm,
    fontSize: 14,
  } as const;

  const stepBtn = {
    width: 30,
    height: 30,
    borderRadius: R.xs,
    border: `1.5px solid ${C.border}`,
    background: C.surface,
    color: C.brand,
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
        padding: S[4],
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-title"
        style={{
          width: "100%",
          maxWidth: 440,
          maxHeight: "88vh",
          background: C.surface,
          borderRadius: R.xl,
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
            padding: `${S[4] + 2}px ${S[5] - 4}px`,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <h3 id="order-title" style={{ ...T.h3, fontSize: 17, margin: 0 }}>
            Table {table.num} order
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none",
              background: C.canvas,
              borderRadius: R.xs,
              width: 32,
              height: 32,
              cursor: "pointer",
              color: C.muted,
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: S[5] - 4, overflow: "auto" }}>
          {/* current lines */}
          {items.length === 0 ? (
            <div
              style={{
                padding: `${S[5] - 4}px 0`,
                textAlign: "center",
                color: C.muted,
                ...T.caption,
              }}
            >
              No items yet. Add the first line below.
            </div>
          ) : (
            items.map((it, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: `${S[3] - 2}px 0`,
                  borderBottom: `1px solid ${C.surfaceAlt}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: S[3] - 2 }}>
                  <span
                    style={{
                      minWidth: 24,
                      height: 24,
                      padding: "0 6px",
                      borderRadius: R.xs - 1,
                      background: C.brandTint,
                      color: C.brand,
                      ...T.caption,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      ...NUM,
                    }}
                  >
                    {it.qty}
                  </span>
                  <span style={{ ...T.body, fontWeight: 600 }}>{it.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: S[3] }}>
                  <span style={{ ...T.body, fontWeight: 700, ...NUM }}>
                    {fmt(it.price)}
                  </span>
                  <button
                    onClick={() => removeLine(i)}
                    aria-label="Remove"
                    style={{
                      border: "none",
                      background: "#FEF2F2",
                      color: "#DC2626",
                      borderRadius: R.xs,
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
                padding: `${S[3]}px 0 ${S[1]}px`,
                ...T.body,
                fontWeight: 800,
              }}
            >
              <span>Subtotal</span>
              <span style={{ color: C.brand, ...NUM }}>{fmt(subtotal)}</span>
            </div>
          )}

          {/* add line */}
          <div
            style={{
              marginTop: S[4] - 2,
              padding: S[4] - 2,
              background: C.surfaceAlt,
              borderRadius: R.md,
            }}
          >
            <div style={{ ...T.caption, fontWeight: 700, color: C.muted, marginBottom: S[3] - 2 }}>
              Add item
            </div>
            <input
              ref={nameRef}
              aria-label="Item name"
              placeholder="Item name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addLine()}
              style={{ ...field, width: "100%", marginBottom: S[3] - 2 }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: S[3] - 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: S[2] }}>
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" style={stepBtn}>
                  −
                </button>
                <span aria-label="Quantity" style={{ ...T.body, fontWeight: 800, minWidth: 18, textAlign: "center", ...NUM }}>
                  {qty}
                </span>
                <button onClick={() => setQty((q) => q + 1)} aria-label="Increase quantity" style={stepBtn}>
                  +
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: S[1] + 2, flex: 1 }}>
                <span style={{ ...T.body, fontWeight: 700, color: C.muted }}>$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  aria-label="Unit price"
                  placeholder="unit price"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addLine()}
                  style={{ ...field, flex: 1, width: "100%" }}
                />
              </div>
              <button
                onClick={addLine}
                disabled={!canAdd}
                style={{ ...btn("primary", { disabled: !canAdd }), padding: "10px 16px", fontSize: 14 }}
              >
                Add
              </button>
            </div>
            {touched && !canAdd && (
              <div style={{ marginTop: S[3] - 2 }}>
                <Alert kind="warn">{validationMsg}</Alert>
              </div>
            )}
          </div>
        </div>

        {/* footer */}
        {err && (
          <div style={{ padding: `${S[3] - 2}px ${S[5] - 4}px 0` }}>
            <Alert kind="danger">{err}</Alert>
          </div>
        )}
        <div
          style={{
            display: "flex",
            gap: S[2] + 2,
            padding: `${S[4]}px ${S[5] - 4}px`,
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <button
            onClick={() => save([])}
            disabled={busy || (table.items?.length ?? 0) === 0}
            style={{
              ...btn("danger", { disabled: busy || (table.items?.length ?? 0) === 0 }),
              padding: "12px 16px",
            }}
          >
            Clear table
          </button>
          <button
            onClick={() => save(items)}
            disabled={busy}
            style={{
              ...btn("primary", { full: true, disabled: busy }),
              flex: 1,
              padding: "12px 16px",
            }}
          >
            {busy ? (
              <>
                <Spinner size={15} color="#fff" /> Saving
              </>
            ) : (
              "Save order"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
