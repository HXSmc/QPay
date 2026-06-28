"use client";

import { useEffect, useRef, useState } from "react";
import { fmt, type Currency } from "../../lib/data";
import { setTableItems } from "../../lib/api";
import type { LiveTable, OrderItem } from "../../lib/types";
import { C, R, S, T, NUM, MONO, STATUS, btn, field as fieldStyle } from "../../lib/theme";
import { Alert, Modal, Spinner } from "../ui/Primitives";
import { useT } from "../../lib/i18n-client";

/**
 * Admin order editor rendered as a popup overlay via the shared <Modal>.
 * Add/remove line items, validation, Spinner and setTableItems are identical
 * to before; the overlay/backdrop/escape/scroll-lock are handled by Modal.
 */
export function OrderModal({
  table,
  currency = "USD",
  onClose,
  onSaved,
}: {
  table: LiveTable;
  currency?: Currency;
  onClose: () => void;
  onSaved: (t: LiveTable) => void;
}) {
  const tr = useT();
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
  }, []);

  const subtotal = items.reduce((a, it) => a + it.price, 0);

  // Inline validation for the add-line row.
  const trimmed = name.trim();
  const u = Number(unit);
  const priceOk = unit.trim() === "" || (Number.isFinite(u) && u >= 0);
  const canAdd = trimmed.length > 0 && qty >= 1 && priceOk;
  const touched = trimmed.length > 0 || unit.trim() !== "";
  const validationMsg = !trimmed
    ? tr("Enter an item name.")
    : !priceOk
      ? tr("Price can't be negative.")
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
      setErr(tr("Couldn't save the order. Please retry."));
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
    <Modal onClose={onClose} ariaLabel={tr("Table {n} order").replace("{n}", table.num)} maxWidth={520}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `${S[4] + 2}px ${S[5] - 4}px`,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <h3 style={{ ...T.h3, fontSize: 17, margin: 0 }}>
          {tr("Table {n} order").replace("{n}", table.num)}
        </h3>
        <button
          onClick={onClose}
          aria-label={tr("Close")}
          className="qp-cta-lift"
          style={{
            border: `1.5px solid ${C.border}`,
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

      <div style={{ padding: S[5] - 4 }}>
        {/* current lines */}
        <div style={{ maxHeight: 320, overflow: "auto" }}>
          {items.length === 0 ? (
            <div
              style={{
                padding: `${S[5] - 4}px 0`,
                textAlign: "center",
                color: C.muted,
                ...T.caption,
              }}
            >
              {tr("No items yet. Add the first line below.")}
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
                  <span style={{ ...T.body, fontWeight: 700, ...MONO }}>
                    {fmt(it.price, currency)}
                  </span>
                  <button
                    onClick={() => removeLine(i)}
                    aria-label={tr("Remove")}
                    style={{
                      border: "none",
                      background: STATUS.danger.bg,
                      color: STATUS.danger.fg,
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
        </div>

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
            <span>{tr("Subtotal")}</span>
            <span style={{ color: C.brand, ...MONO }}>{fmt(subtotal, currency)}</span>
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
            {tr("Add item")}
          </div>
          <input
            ref={nameRef}
            aria-label={tr("Item name")}
            placeholder={tr("Item name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addLine()}
            style={{ ...field, width: "100%", marginBottom: S[3] - 2 }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: S[3] - 2, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: S[2] }}>
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label={tr("Decrease quantity")} style={stepBtn}>
                −
              </button>
              <span aria-label={tr("Quantity")} style={{ ...T.body, fontWeight: 800, minWidth: 18, textAlign: "center", ...NUM }}>
                {qty}
              </span>
              <button onClick={() => setQty((q) => q + 1)} aria-label={tr("Increase quantity")} style={stepBtn}>
                +
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: S[1] + 2, flex: "1 1 160px" }}>
              <span style={{ ...T.body, fontWeight: 700, color: C.muted }}>$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                aria-label={tr("Unit price")}
                placeholder={tr("unit price")}
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
              {tr("Add")}
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
          {tr("Clear table")}
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
              <Spinner size={15} color="#fff" /> {tr("Saving")}
            </>
          ) : (
            tr("Save order")
          )}
        </button>
      </div>
    </Modal>
  );
}
