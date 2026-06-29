"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { billDue, fmt, type Currency } from "../../../lib/data";
import {
  createTable,
  deleteTable,
  getMe,
  getSettings,
  listBranches,
  listTables,
  setTableItems,
} from "../../../lib/api";
import type { Branch, LiveTable, TableStatus } from "../../../lib/types";
import { QrModal } from "../../../components/admin/QrModal";
import { OrderModal } from "../../../components/admin/OrderModal";
import { C, R, S, T, NUM, MONO, STATUS, badge, btn, card } from "../../../lib/theme";
import { Alert, EmptyState, Skeleton, Spinner } from "../../../components/ui/Primitives";
import { useT } from "../../../lib/i18n-client";

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
  const tr = useT();
  const [tables, setTables] = useState<LiveTable[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [multiBranch, setMultiBranch] = useState(false);
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

  // Timestamp of the last local optimistic mutation. A poll whose listTables()
  // started before a mutation but resolves after it is dropped, so a just
  // added/deleted/cleared table can't be clobbered by a stale server snapshot.
  const lastMutationRef = useRef(0);

  useEffect(() => {
    listTables()
      .then(setTables)
      .catch(() => setError(tr("Couldn't load your tables. Please refresh.")))
      .finally(() => setLoading(false));
    // Load branches; if the account has multiple, a branch switcher appears and
    // tables are filtered/created per branch. The ?branch query (from the
    // Branches page "Manage tables" link) pre-selects one.
    listBranches()
      .then((b) => {
        setBranches(b);
        const wanted =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("branch")
            : null;
        const initial = wanted && b.some((x) => x.id === wanted) ? wanted : b[0]?.id ?? "";
        setSelectedBranch(initial);
      })
      .catch(() => {});
    getSettings()
      .then(async (s) => {
        setCurrency(s.currency);
        setMultiBranch((s.branches ?? 1) > 1);
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
      const t0 = Date.now();
      listTables()
        .then((rows) => {
          // Drop the snapshot if a local mutation happened after this poll began.
          if (lastMutationRef.current <= t0) setTables(rows);
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const defaultBranchId = branches[0]?.id;
  const showBranches = multiBranch && branches.length > 1;
  const visibleTables = showBranches
    ? tables.filter(
        (t) =>
          t.branchId === selectedBranch ||
          (selectedBranch === defaultBranchId && (t.branchId == null || t.branchId === "")),
      )
    : tables;

  const addTable = async () => {
    setBusy(true);
    setError("");
    try {
      const t = await createTable(showBranches ? selectedBranch : undefined);
      setTables((prev) => [...prev, t]);
      lastMutationRef.current = Date.now();
    } catch (e) {
      // Surface the server message (e.g. the table-cap limit) when present.
      setError(e instanceof Error ? e.message : tr("Couldn't add a table. Please retry."));
    } finally {
      setBusy(false);
    }
  };

  const clearTable = async (t: LiveTable) => {
    setError("");
    try {
      const updated = await setTableItems(t.num, []);
      applyTable(updated);
      lastMutationRef.current = Date.now();
    } catch {
      setError(`${tr("Couldn't clear Table")} ${t.num}. ${tr("Please retry.")}`);
    }
  };

  const removeTable = async (t: LiveTable) => {
    setConfirmDel(null);
    setError("");
    try {
      await deleteTable(t.num);
      setTables((prev) => prev.filter((x) => x.num !== t.num));
      lastMutationRef.current = Date.now();
    } catch {
      // Keep the row if the delete failed (e.g. session expired) rather than
      // dropping an unhandled rejection and lying about the table being gone.
      setError(`${tr("Couldn't delete Table")} ${t.num}. ${tr("Please retry.")}`);
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
            {tr("Tables & QR")}
          </div>
          <h1 style={{ ...T.h1, margin: 0, color: C.text }}>
            {tr("Tables & QR codes")}
          </h1>
          <p style={{ ...T.body, color: C.muted, margin: `${S[2]}px 0 0`, maxWidth: 460 }}>
            {tr("Add tables, generate a scan-to-pay QR, then clear or delete when done.")}
          </p>
        </div>
        <button
          className="qp-cta-lift"
          onClick={addTable}
          disabled={busy}
          style={btn("primary", { size: "sm", disabled: busy })}
        >
          {busy && <Spinner size={14} color="#fff" />}
          {tr("+ New table")}
        </button>
      </div>

      {showBranches && (
        <div
          className="qp-scroll-x"
          style={{ display: "flex", gap: S[2], marginBottom: S[5], flexWrap: "wrap" }}
          role="group"
          aria-label={tr("Branches")}
        >
          {branches.map((b) => {
            const active = b.id === selectedBranch;
            return (
              <button
                key={b.id}
                aria-pressed={active}
                onClick={() => setSelectedBranch(b.id)}
                className="qp-press"
                style={{
                  ...btn(active ? "primary" : "secondary", { size: "sm" }),
                  borderRadius: R.pill,
                }}
              >
                {b.name}
              </button>
            );
          })}
        </div>
      )}

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
            {tr(STATUS_LABEL[s])}
          </span>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: S[3] + 2 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} h={196} radius={R.md} />
          ))}
        </div>
      ) : visibleTables.length === 0 ? (
        <EmptyState
          title={tr("No tables yet")}
          body={tr("Create your first table to generate a QR code and start taking scan-to-pay orders.")}
          action={
            <button className="qp-cta-lift" onClick={addTable} disabled={busy} style={btn("primary", { size: "sm", disabled: busy })}>
              {busy && <Spinner size={14} color="#fff" />}
              {tr("Create your first table")}
            </button>
          }
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: S[3] + 2 }}>
          {visibleTables.map((t) => {
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
                  <span style={{ ...T.h3, ...NUM }}>{tr("Table {n}").replace("{n}", t.num)}</span>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: dot, display: "inline-block" }} />
                </div>
                <div style={{ ...T.h2, marginTop: S[3] - 2, ...MONO }}>
                  {t.amount}
                </div>
                <div style={{ marginTop: S[2], ...badge(STATUS_BADGE[t.status]) }}>
                  {tr(STATUS_LABEL[t.status])}
                </div>
                {t.status === "partial" && (
                  <div style={{ ...T.caption, color: C.muted, marginTop: S[2] - 1, ...MONO }}>
                    {tr("Paid")} {fmt(t.paid, currency)} {tr("of")} {fmt(billDue(t.items), currency)}
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
                  {t.items?.length ? `${tr("Order")} · ${t.items.length}` : tr("Add order")}
                </button>
                {confirmDel === t.num ? (
                  <div style={{ display: "flex", gap: S[2], marginTop: S[2] }}>
                    <button
                      className="qp-cta-lift"
                      onClick={() => removeTable(t)}
                      style={{ ...btn("danger", { size: "sm" }), flex: 1 }}
                    >
                      {tr("Confirm?")}
                    </button>
                    <button
                      className="qp-cta-lift"
                      onClick={() => setConfirmDel(null)}
                      style={{ ...btn("secondary", { size: "sm" }), flex: 1 }}
                    >
                      {tr("Cancel")}
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
                      {tr("QR")}
                    </button>
                    <button
                      className="qp-cta-lift"
                      onClick={() => setConfirmDel(t.num)}
                      style={{ ...btn("danger", { size: "sm" }), flex: 1 }}
                    >
                      {tr("Delete")}
                    </button>
                  </div>
                )}
                {t.status === "cleared" && (
                  <button
                    className="qp-cta-lift"
                    onClick={() => clearTable(t)}
                    style={{ ...btn("success", { size: "sm", full: true }), marginTop: S[2] }}
                  >
                    {tr("Clear table")}
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
