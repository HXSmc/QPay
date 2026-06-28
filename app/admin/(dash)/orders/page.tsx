"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listOrders, setOrderStatus } from "../../../lib/api";
import { fmt } from "../../../lib/data";
import { C, R, S, T, MONO, SHADOW, badge, btn } from "../../../lib/theme";
import { EmptyState, Skeleton } from "../../../components/ui/Primitives";
import type { Order, OrderStatus } from "../../../lib/types";

const POLL_MS = 3000;

const STATUS_BADGE: Record<OrderStatus, Parameters<typeof badge>[0]> = {
  placed: "warn",
  preparing: "info",
  served: "success",
  cancelled: "neutral",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [activeOnly, setActiveOnly] = useState(true);
  const activeRef = useRef(activeOnly);
  activeRef.current = activeOnly;

  const load = useCallback(async () => {
    try {
      setOrders(await listOrders(activeRef.current));
    } catch {
      setOrders((cur) => cur ?? []);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, activeOnly]);

  // Live poll so new orders appear without a refresh (mirrors the dashboard).
  useEffect(() => {
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const advance = async (o: Order, status: OrderStatus) => {
    setOrders((cur) => cur!.map((x) => (x.id === o.id ? { ...x, status } : x)));
    try {
      await setOrderStatus(o.id, status);
      load();
    } catch {
      load();
    }
  };

  return (
    <div className="qp-page" style={{ padding: "30px 36px", maxWidth: 920 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: S[5],
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ ...T.h1, margin: 0 }}>Orders</h1>
          <p style={{ ...T.body, color: C.muted, margin: "6px 0 0" }}>
            Live orders diners placed from their phones, with kitchen notes.
          </p>
        </div>
        <div style={{ display: "inline-flex", gap: 4, background: C.canvas, padding: 4, borderRadius: R.md }}>
          {[
            { k: true, label: "Active" },
            { k: false, label: "All" },
          ].map((t) => (
            <button
              key={String(t.k)}
              onClick={() => setActiveOnly(t.k)}
              style={{
                padding: "8px 16px",
                borderRadius: R.sm,
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 13.5,
                fontWeight: 700,
                background: activeOnly === t.k ? C.surface : "transparent",
                color: activeOnly === t.k ? C.brand : C.muted,
                boxShadow: activeOnly === t.k ? SHADOW.e1 : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {orders === null ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: S[4] }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} h={180} radius={R.lg} />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          title={activeOnly ? "No active orders" : "No orders yet"}
          body="When diners order from their phone, their orders appear here in real time. Add orderable items under Menu → Order items to enable this."
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: S[4] }}>
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} onAdvance={advance} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onAdvance }: { order: Order; onAdvance: (o: Order, s: OrderStatus) => void }) {
  const time = new Date(order.createdAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${order.status === "placed" ? C.brand : C.border}`,
        borderRadius: R.lg,
        padding: S[4],
        display: "flex",
        flexDirection: "column",
        gap: S[3],
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ ...T.h3 }}>Table {order.tableNum}</div>
        <span style={badge(STATUS_BADGE[order.status])}>{order.status}</span>
      </div>
      <div style={{ ...T.caption, color: C.faint }}>{time}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: S[2] }}>
        {order.lines.map((l) => (
          <div key={l.id} style={{ display: "flex", gap: 10 }}>
            <span
              style={{
                ...T.caption,
                fontWeight: 800,
                color: C.brand,
                background: C.brandTint,
                borderRadius: R.xs,
                padding: "1px 7px",
                height: "fit-content",
              }}
            >
              {l.qty}×
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...T.body, fontWeight: 600, color: C.text }}>{l.name}</div>
              {l.comment && (
                <div style={{ ...T.caption, color: C.muted, fontStyle: "italic" }}>“{l.comment}”</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: `1px solid ${C.border}`,
          paddingTop: S[3],
        }}
      >
        <span style={{ ...T.h3, ...MONO, color: C.text }}>{fmt(order.total)}</span>
        <div style={{ display: "flex", gap: 6 }}>
          {order.status === "placed" && (
            <button onClick={() => onAdvance(order, "preparing")} style={btn("primary", { size: "sm" })}>
              Start
            </button>
          )}
          {order.status === "preparing" && (
            <button onClick={() => onAdvance(order, "served")} style={btn("success", { size: "sm" })}>
              Served
            </button>
          )}
          {(order.status === "placed" || order.status === "preparing") && (
            <button onClick={() => onAdvance(order, "cancelled")} style={btn("danger", { size: "sm" })}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
