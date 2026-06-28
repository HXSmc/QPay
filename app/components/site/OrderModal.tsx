"use client";

// Consumer ordering modal (optional feature). Shown only when the restaurant has
// defined orderable items. Diners browse by category, set quantities, add a
// free-text note per line ("burger no cheese"), see a running total, and place
// the order — which lands in the admin's Orders inbox. Does not touch the
// existing pay/split/tip flow.

import { useEffect, useMemo, useRef, useState } from "react";
import { C, R, S, SHADOW, T, btn, field } from "../../lib/theme";
import { fmt } from "../../lib/data";
import { placeOrder } from "../../lib/api";
import { Alert, Spinner } from "../ui/Primitives";
import type { MenuItem } from "../../lib/types";

type Cart = Record<string, { qty: number; comment: string }>;

export function OrderModal({
  open,
  token,
  items,
  onClose,
  onPlaced,
}: {
  open: boolean;
  token: string;
  items: MenuItem[];
  onClose: () => void;
  onPlaced: () => void;
}) {
  const [cart, setCart] = useState<Cart>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);

  // Reset only when the modal opens — NOT on every parent re-render. The parent
  // (CustomerView) re-renders every 3s from its live poll and passes fresh
  // onClose/onPlaced closures; keying the reset on those would wipe the cart
  // mid-order. So reset depends on `open` alone.
  useEffect(() => {
    if (!open) return;
    setCart({});
    setError("");
    closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Group items by category, preserving menu order.
  const groups = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const it of items) {
      const key = it.category || "Menu";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return [...map.entries()];
  }, [items]);

  if (!open) return null;

  const setQty = (id: string, qty: number) =>
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[id];
      else next[id] = { qty, comment: c[id]?.comment ?? "" };
      return next;
    });
  const setComment = (id: string, comment: string) =>
    setCart((c) => (c[id] ? { ...c, [id]: { ...c[id], comment } } : c));

  const lines = Object.entries(cart);
  const total = lines.reduce((a, [id, l]) => {
    const it = items.find((x) => x.id === id);
    return a + (it ? it.price * l.qty : 0);
  }, 0);
  const count = lines.reduce((a, [, l]) => a + l.qty, 0);

  const submit = async () => {
    if (count === 0) return;
    setBusy(true);
    setError("");
    try {
      await placeOrder(
        token,
        lines.map(([id, l]) => ({ menuItemId: id, qty: l.qty, comment: l.comment })),
      );
      onPlaced();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not place the order. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(11,18,33,0.55)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 0,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Order food"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 460,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          background: C.surface,
          borderRadius: `${R.xl}px ${R.xl}px 0 0`,
          boxShadow: SHADOW.e3,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 20px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div>
            <div style={{ ...T.h2 }}>Order food</div>
            <div style={{ ...T.caption, color: C.muted, marginTop: 2 }}>
              Add items and any notes for the kitchen.
            </div>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 34,
              height: 34,
              borderRadius: R.sm,
              border: "none",
              background: C.canvas,
              color: C.muted,
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflow: "auto", padding: "8px 20px 16px" }}>
          {groups.map(([cat, list]) => (
            <div key={cat} style={{ marginTop: S[4] }}>
              <div
                style={{
                  ...T.caption,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: C.faint,
                  fontWeight: 800,
                  marginBottom: S[2],
                }}
              >
                {cat}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: S[2] }}>
                {list.map((it) => {
                  const line = cart[it.id];
                  const qty = line?.qty ?? 0;
                  return (
                    <div
                      key={it.id}
                      style={{
                        border: `1px solid ${qty > 0 ? C.brand : C.border}`,
                        borderRadius: R.md,
                        padding: 14,
                        background: qty > 0 ? C.brandTint : C.surface,
                        transition: "border-color .15s, background .15s",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ ...T.h3, color: C.text }}>{it.name}</div>
                          {it.description && (
                            <div style={{ ...T.caption, color: C.muted, marginTop: 3 }}>
                              {it.description}
                            </div>
                          )}
                          <div style={{ ...T.label, color: C.brand, marginTop: 6 }}>
                            {fmt(it.price)}
                          </div>
                        </div>
                        <Stepper qty={qty} onChange={(q) => setQty(it.id, q)} />
                      </div>
                      {qty > 0 && (
                        <input
                          value={line?.comment ?? ""}
                          onChange={(e) => setComment(it.id, e.target.value)}
                          placeholder="Add a note, e.g. no cheese"
                          maxLength={160}
                          style={{ ...field(), marginTop: 12, fontSize: 13.5 }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px 20px", borderTop: `1px solid ${C.border}` }}>
          {error && (
            <div style={{ marginBottom: 10 }}>
              <Alert kind="danger">{error}</Alert>
            </div>
          )}
          <button
            className="qp-cta qp-press"
            onClick={submit}
            disabled={busy || count === 0}
            style={{ ...btn("primary", { full: true, size: "lg", disabled: busy || count === 0 }) }}
          >
            {busy ? (
              <Spinner color="#fff" />
            ) : count === 0 ? (
              "Choose items to order"
            ) : (
              `Place order · ${count} item${count === 1 ? "" : "s"} · ${fmt(total)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stepper({ qty, onChange }: { qty: number; onChange: (q: number) => void }) {
  const sq: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: R.xs,
    border: `1.5px solid ${C.border}`,
    background: C.surface,
    color: C.brand,
    fontSize: 18,
    fontWeight: 700,
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    lineHeight: 1,
    flexShrink: 0,
  };
  if (qty === 0) {
    return (
      <button
        className="qp-press"
        onClick={() => onChange(1)}
        aria-label="Add"
        style={{ ...btn("secondary", { size: "sm" }), color: C.brand, borderColor: C.brand, height: 32 }}
      >
        Add
      </button>
    );
  }
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 32 }}>
      <button className="qp-press" style={sq} onClick={() => onChange(qty - 1)} aria-label="Remove one">
        −
      </button>
      <span style={{ minWidth: 16, textAlign: "center", fontWeight: 800, fontSize: 15 }}>{qty}</span>
      <button className="qp-press" style={sq} onClick={() => onChange(qty + 1)} aria-label="Add one">
        +
      </button>
    </div>
  );
}
