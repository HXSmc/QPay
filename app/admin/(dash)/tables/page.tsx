"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { billDue, fmt, type Currency } from "../../../lib/data";
import {
  createTable,
  deleteTable,
  getMe,
  getSettings,
  listTables,
  setTableItems,
} from "../../../lib/api";
import type { LiveTable, TableStatus } from "../../../lib/types";
import { QrModal } from "../../../components/admin/QrModal";
import { OrderModal } from "../../../components/admin/OrderModal";
import { C, R, S, T, NUM, MONO, STATUS, badge, btn, card } from "../../../lib/theme";
import { Alert, EmptyState, Skeleton, Spinner } from "../../../components/ui/Primitives";

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

export default function TablesPage() {
  const [tables, setTables] = useState<LiveTable[]>([]);
  const [qrFor, setQrFor] = useState<LiveTable | null>(null);
  const [orderFor, setOrderFor] = useState<LiveTable | null>(null);
  const [busy, setBusy] = useState(false);
  const [restaurantName, setRestaurantName] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Which table is awaiting a delete confirmation (inline, no browser dialog).
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const applyTable = (t: LiveTable) =>
    setTables((prev) => prev.map((x) => (x.num === t.num ? t : x)));

  // Pause live polling while an order is being edited so a refresh can't yank
  // the card out from under the open modal.
  const orderOpenRef = useRef(false);
  useEffect(() => {
    orderOpenRef.current = orderFor !== null;
  }, [orderFor]);

  useEffect(() => {
    listTables()
      .then(setTables)
      .catch(() => setError("Couldn't load your tables. Please refresh."))
      .finally(() => setLoading(false));
    getSettings()
      .then(async (s) => {
        setCurrency(s.currency);
        if (s.name) return setRestaurantName(s.name);
        const me = await getMe();
        setRestaurantName(me.email.split("@")[0]);
      })
      .catch(() => {});

    // Live refresh: poll the owner-scoped table list so payment state (e.g. a
    // customer fully paying -> "cleared" + the Clear button) appears without a
    // manual page refresh. Pauses when the tab is hidden or an order is open.
    const id = setInterval(() => {
      if (document.hidden || orderOpenRef.current) return;
      listTables().then(setTables).catch(() => {});
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const addTable = async () => {
    setBusy(true);
    setError("");
    try {
      const t = await createTable();
      setTables((prev) => [...prev, t]);
    } catch {
      setError("Couldn't add a table. Please retry.");
    } finally {
      setBusy(false);
    }
  };

  const clearTable = async (t: LiveTable) => {
    setError("");
    try {
      const updated = await setTableItems(t.num, []);
      applyTable(updated);
    } catch {
      setError(`Couldn't clear Table ${t.num}. Please retry.`);
    }
  };

  const removeTable = async (t: LiveTable) => {
    setConfirmDel(null);
    setError("");
    try {
      await deleteTable(t.num);
      setTables((prev) => prev.filter((x) => x.num !== t.num));
    } catch {
      // Keep the row if the delete failed (e.g. session expired) rather than
      // dropping an unhandled rejection and lying about the table being gone.
      setError(`Couldn't delete Table ${t.num}. Please retry.`);
    }
  };

  return (
    <div className="qp-page" style={{ padding: `${S[6]}px ${S[6] + 4}px` }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: S[5],
        }}
      >
        <div>
          <div style={{ ...T.label, color: C.brand, marginBottom: S[1] }}>
            Tables &amp; QR
          </div>
          <h1 style={{ ...T.h1, margin: 0, color: C.text }}>
            Tables &amp; QR codes
          </h1>
          <p style={{ ...T.body, color: C.muted, margin: `${S[2]}px 0 0`, maxWidth: 460 }}>
            Add tables, generate a scan-to-pay QR, then clear or delete when done.
          </p>
        </div>
        <button
          className="qp-cta-lift"
          onClick={addTable}
          disabled={busy}
          style={btn("primary", { size: "sm", disabled: busy })}
        >
          {busy && <Spinner size={14} color="#fff" />}
          + New table
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: S[4] }}>
          <Alert kind="danger">{error}</Alert>
        </div>
      )}

      {/* legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: S[4], marginBottom: S[5], ...T.caption, color: C.muted }}>
        {(["unpaid", "partial", "cleared", "open"] as TableStatus[]).map((s) => (
          <span key={s} style={{ display: "flex", alignItems: "center", gap: S[1] + 2 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: STATUS[STATUS_BADGE[s]].fg }} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: S[3] + 2 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} h={196} radius={R.md} />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <EmptyState
          title="No tables yet"
          body="Create your first table to generate a QR code and start taking scan-to-pay orders."
          action={
            <button className="qp-cta-lift" onClick={addTable} disabled={busy} style={btn("primary", { size: "sm", disabled: busy })}>
              {busy && <Spinner size={14} color="#fff" />}
              Create your first table
            </button>
          }
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: S[3] + 2 }}>
          {tables.map((t) => {
            const dot = STATUS[STATUS_BADGE[t.status]].fg;
            return (
              <Fragment key={t.num}>
              <div
                style={{
                  ...card({ pad: S[4], radius: R.md }),
                  background: t.status === "open" ? C.surfaceAlt : C.surface,
                  borderLeft: "3px solid " + dot,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ ...T.h3, ...NUM }}>Table {t.num}</span>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: dot, display: "inline-block" }} />
                </div>
                <div style={{ ...T.h2, marginTop: S[3] - 2, ...MONO }}>
                  {t.amount}
                </div>
                <div style={{ marginTop: S[2], ...badge(STATUS_BADGE[t.status]) }}>
                  {STATUS_LABEL[t.status]}
                </div>
                {t.status === "partial" && (
                  <div style={{ ...T.caption, color: C.muted, marginTop: S[2] - 1, ...MONO }}>
                    Paid {fmt(t.paid, currency)} of {fmt(billDue(t.items), currency)}
                  </div>
                )}
                <button
                  className="qp-cta-lift"
                  onClick={() => {
                    setQrFor(null);
                    setOrderFor((cur) => (cur?.num === t.num ? null : t));
                  }}
                  aria-expanded={orderFor?.num === t.num}
                  style={{
                    width: "100%",
                    marginTop: S[3] + 2,
                    padding: "8px 0",
                    borderRadius: R.sm,
                    fontFamily: "inherit",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    background: C.brandTint,
                    color: C.brand,
                    border: `1.5px solid ${C.border}`,
                  }}
                >
                  {t.items?.length ? `Order · ${t.items.length}` : "Add order"}
                </button>
                {confirmDel === t.num ? (
                  <div style={{ display: "flex", gap: S[2], marginTop: S[2] }}>
                    <button
                      className="qp-cta-lift"
                      onClick={() => removeTable(t)}
                      style={{ ...btn("danger", { size: "sm" }), flex: 1 }}
                    >
                      Confirm?
                    </button>
                    <button
                      className="qp-cta-lift"
                      onClick={() => setConfirmDel(null)}
                      style={{ ...btn("secondary", { size: "sm" }), flex: 1 }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: S[2], marginTop: S[2] }}>
                    <button
                      className="qp-cta-lift"
                      onClick={() => {
                        setOrderFor(null);
                        setQrFor((cur) => (cur?.num === t.num ? null : t));
                      }}
                      aria-expanded={qrFor?.num === t.num}
                      style={{ ...btn("primary", { size: "sm" }), flex: 1 }}
                    >
                      QR
                    </button>
                    <button
                      className="qp-cta-lift"
                      onClick={() => setConfirmDel(t.num)}
                      style={{ ...btn("danger", { size: "sm" }), flex: 1 }}
                    >
                      Delete
                    </button>
                  </div>
                )}
                {t.status === "cleared" && (
                  <button
                    className="qp-cta-lift"
                    onClick={() => clearTable(t)}
                    style={{ ...btn("success", { size: "sm", full: true }), marginTop: S[2] }}
                  >
                    Clear table
                  </button>
                )}
              </div>

              {qrFor?.num === t.num && (
                <QrModal
                  key={`qr-${t.num}`}
                  tableNum={t.num}
                  token={t.token}
                  restaurantName={restaurantName}
                  onClose={() => setQrFor(null)}
                />
              )}
              {orderFor?.num === t.num && (
                <OrderModal
                  key={`order-${t.num}`}
                  table={orderFor}
                  currency={currency}
                  onClose={() => setOrderFor(null)}
                  onSaved={applyTable}
                />
              )}
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
