"use client";

import { useEffect, useRef, useState } from "react";
import { billDue, BRAND, fmt, TIP_PCT } from "../lib/data";
import { getPublicMenuItems, payTable, syncTable } from "../lib/api";
import type { LiveTable, MenuItem, SplitMode, TipKey } from "../lib/types";
import { MenuModal } from "./site/MenuModal";
import { OrderModal } from "./site/OrderModal";
import { Toast } from "./ui/Primitives";

// Calm shared easing for inline reveals and state transitions.
const EASE = "cubic-bezier(0.16,1,0.3,1)";

const SPLIT_DEFS: { key: SplitMode; label: string }[] = [
  { key: "full", label: "Pay full" },
  { key: "equal", label: "Split equally" },
  { key: "item", label: "Pay per item" },
];

const TIP_DEFS: { key: TipKey; label: string }[] = [
  { key: "0", label: "No tip" },
  { key: "10", label: "10%" },
  { key: "15", label: "15%" },
  { key: "20", label: "20%" },
  { key: "custom", label: "Custom" },
];

type CustTable = Omit<LiveTable, "owner" | "token">;

export function CustomerView({
  tableNumber = "12",
  initialTable = null,
  token,
  restaurant = "Restaurant",
  taxRate = 8,
}: {
  tableNumber?: string;
  initialTable?: CustTable | null;
  token: string;
  restaurant?: string;
  taxRate?: number;
}) {
  // Stable per-phone id so reservations from other phones are distinguishable.
  const [clientId] = useState(() => {
    if (typeof window === "undefined") return "ssr";
    const k = "qpay_client_id";
    let v = sessionStorage.getItem(k);
    if (!v) {
      v = (crypto.randomUUID?.() ?? String(Math.random())).slice(0, 14);
      sessionStorage.setItem(k, v);
    }
    return v;
  });

  // Live, server-shared table state (items / paid / paidQty / reservations).
  const [table, setTable] = useState<CustTable>(
    initialTable ?? {
      num: tableNumber,
      status: "open",
      amount: "—",
      items: [],
      paid: 0,
      paidQty: [],
      reservations: [],
    },
  );

  const items = table.items;
  const paid = table.paid ?? 0;
  const paidQty = table.paidQty ?? [];
  const reservations = table.reservations ?? [];

  const [split, setSplit] = useState<SplitMode>("full");
  const [tip, setTip] = useState<TipKey>("15");
  const [customTip, setCustomTip] = useState("12.00");
  const [peopleAtTable, setPeopleAtTable] = useState(4);
  const [payingFor, setPayingFor] = useState(1);
  const [selectedQty, setSelectedQty] = useState<number[]>(() =>
    (initialTable?.items ?? []).map(() => 0),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  // Optional in-app ordering: orderable items the restaurant has defined.
  const [orderItems, setOrderItems] = useState<MenuItem[]>([]);
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderToast, setOrderToast] = useState("");
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState<{
    paid: number;
    cleared: boolean;
    remaining: number;
  } | null>(null);

  // Monotonic request sequencing so an out-of-order sync response can't clobber
  // newer state (e.g. a slow 3s poll resolving after a payment). Each issued
  // request takes a seq; we only apply a result whose seq is the latest seen.
  const reqSeq = useRef(0);
  const appliedSeq = useRef(0);

  // clientId is "ssr" on the server but a real id on the client. Gate the
  // reservation-derived UI behind a post-mount flag so the first client render
  // matches the server HTML (no hydration mismatch); after mount we use the
  // real id so this phone's own hold is excluded.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const ownId = mounted ? clientId : "ssr";

  // Load orderable items (optional feature). If none, the Order button stays
  // hidden and the customer flow is exactly as before.
  useEffect(() => {
    if (!token) return;
    getPublicMenuItems(tableNumber, token)
      .then(setOrderItems)
      .catch(() => setOrderItems([]));
  }, [token, tableNumber]);
  const canOrder = orderItems.length > 0;

  const hasOrder = items.length > 0;

  // --- live availability (units held by OTHER phones / already paid) ---
  const reservedByOthers = items.map((_, i) =>
    reservations
      .filter((r) => r.id !== ownId)
      .reduce((a, r) => a + (r.qty?.[i] ?? 0), 0),
  );
  const available = items.map((_, i) =>
    Math.max(0, items[i].qty - (paidQty[i] ?? 0) - reservedByOthers[i]),
  );

  // --- bill totals ---
  // Restaurant-configured tax rate (percent → multiplier).
  const taxMul = 1 + taxRate / 100;
  const subtotal = +items.reduce((a, it) => a + it.price, 0).toFixed(2);
  const tax = +(subtotal * (taxRate / 100)).toFixed(2);
  const due = +(subtotal + tax).toFixed(2);
  const remaining = Math.max(0, +(due - paid).toFixed(2));
  const fullyPaid = hasOrder && remaining <= 0.001;
  const isCustomTip = tip === "custom";

  // --- split equally (share of the *remaining* balance) ---
  const clampedPaying = Math.min(payingFor, peopleAtTable);
  const perPerson = +(due / peopleAtTable).toFixed(2);
  const equalPrincipal = Math.min(
    +(perPerson * clampedPaying).toFixed(2),
    remaining,
  );
  const atTableInc = () => setPeopleAtTable((p) => Math.min(p + 1, 20));
  // Keep the updater pure (no nested setState — it double-fires under
  // StrictMode). `clampedPaying` already caps payingFor to the headcount.
  const atTableDec = () => setPeopleAtTable((p) => Math.max(1, p - 1));
  const payingInc = () => setPayingFor((pf) => Math.min(pf + 1, peopleAtTable));
  const payingDec = () => setPayingFor((pf) => Math.max(1, pf - 1));

  // --- pay per item (principal = selected subtotal + proportional 8% tax) ---
  const unitPrice = (i: number) => items[i].price / items[i].qty;
  const itemSubtotal = items.reduce(
    (a, _it, i) => a + unitPrice(i) * (selectedQty[i] ?? 0),
    0,
  );
  const itemPrincipal = +(itemSubtotal * taxMul).toFixed(2);
  const selectedUnits = selectedQty.reduce((a, n) => a + n, 0);
  const selectedCount = selectedQty.filter((n) => n > 0).length;
  const setQty = (i: number, q: number) =>
    setSelectedQty((sel) => {
      const next = sel.slice();
      next[i] = Math.max(0, Math.min(q, available[i]));
      return next;
    });

  // --- amount to charge (principal + cosmetic tip) ---
  let principal = remaining;
  let payNote = "";
  if (split === "equal") {
    principal = equalPrincipal;
    payNote = " (your share)";
  } else if (split === "item") {
    principal = itemPrincipal;
    payNote = " (your items)";
  }
  const tipAmt = isCustomTip
    ? Math.max(0, Number(customTip) || 0)
    : +(principal * TIP_PCT[tip]).toFixed(2);
  const payAmount = +(principal + tipAmt).toFixed(2);

  const payLabel = fullyPaid
    ? "Bill fully paid"
    : split === "item" && selectedCount === 0
      ? "Select items to pay"
      : "Pay " + fmt(payAmount) + payNote;

  const payDisabled =
    paying ||
    fullyPaid ||
    principal <= 0 ||
    (split === "item" && selectedCount === 0);

  // --- live sync: heartbeat my selection + read the merged table back ---
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const seq = ++reqSeq.current;
      try {
        const qty = split === "item" ? selectedQty : items.map(() => 0);
        const next = await syncTable(tableNumber, clientId, qty, token);
        // Drop stale responses: a later request (or a payment) already applied.
        if (alive && seq > appliedSeq.current) {
          appliedSeq.current = seq;
          setTable(next);
        }
      } catch {
        /* ignore transient errors */
      }
    };
    tick();
    const iv = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [tableNumber, clientId, split, selectedQty, items.length]);

  // Keep my selection within what's still available after each sync.
  useEffect(() => {
    setSelectedQty((sel) => {
      let changed = sel.length !== items.length;
      const next = items.map((_, i) => {
        const v = Math.max(0, Math.min(sel[i] ?? 0, available[i]));
        if (v !== (sel[i] ?? 0)) changed = true;
        return v;
      });
      return changed ? next : sel;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  const handlePay = async (method: string = "Card") => {
    if (payDisabled) return;
    setPaying(true);
    const seq = ++reqSeq.current;
    const paidBefore = paid;
    try {
      // Send the PRINCIPAL only — `paid` tracks the bill owed; the tip is
      // cosmetic/per-payer and must not eat into the shared remaining balance
      // (otherwise partial pays mark the bill cleared while the restaurant
      // under-collects principal by the tip).
      const next = await payTable(tableNumber, principal, {
        id: clientId,
        items: split === "item" ? selectedQty : undefined,
        method,
        token,
      });
      // The payment is authoritative — it must supersede EVERY in-flight poll,
      // not just requests issued before it. Advance past the latest seq so a
      // slow earlier poll resolving afterward can't revert us to "unpaid".
      void seq;
      appliedSeq.current = reqSeq.current;
      setTable(next);
      setSelectedQty(next.items.map(() => 0));
      // Report what the store ACTUALLY applied (it clamps to remaining), not the
      // intended amount — otherwise a clamped pay shows an inflated receipt. The
      // tip is cosmetic, so scale it to the fraction of principal that actually
      // landed (if another phone paid first and applied=0, no tip is shown).
      const appliedPrincipal = Math.max(0, +(next.paid - paidBefore).toFixed(2));
      const tipApplied =
        principal > 0
          ? +(tipAmt * (appliedPrincipal / principal)).toFixed(2)
          : 0;
      const shownPaid = +(appliedPrincipal + tipApplied).toFixed(2);
      setResult({
        paid: shownPaid,
        cleared: next.status === "cleared",
        remaining: Math.max(0, +(billDue(next.items) - next.paid).toFixed(2)),
      });
    } catch {
      /* mock — swallow; button re-enables for retry */
    } finally {
      setPaying(false);
    }
  };

  const otherGuests = reservations.filter((r) => r.id !== ownId).length;
  const equalNote = `${fmt(perPerson)} per person × ${clampedPaying}`;
  const itemNote =
    selectedUnits === 0
      ? "No items selected yet"
      : `${selectedUnits} item${selectedUnits === 1 ? "" : "s"} selected`;

  const stepperBtn = {
    width: 32,
    height: 32,
    borderRadius: 9,
    border: "1.5px solid #E2E8F0",
    background: "#fff",
    color: BRAND,
    fontFamily: "inherit",
    fontSize: 19,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  } as const;

  const miniBtn = {
    width: 28,
    height: 28,
    borderRadius: 9,
    border: "1.5px solid #CBD5E1",
    background: "#fff",
    color: BRAND,
    fontFamily: "inherit",
    fontSize: 17,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  } as const;

  return (
    <div
      style={{
        minHeight: "calc(100vh - 60px)",
        background: "linear-gradient(160deg,#EEF2FF,#F8FAFC 40%)",
        display: "flex",
        justifyContent: "center",
        padding: "36px 16px",
      }}
    >
      {orderToast && (
        <Toast message={orderToast} kind="success" onDone={() => setOrderToast("")} />
      )}
      <div style={{ width: "100%", maxWidth: 404 }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 30,
            overflow: "hidden",
            boxShadow: "0 24px 60px rgba(11,18,33,0.18)",
            border: "1px solid #E2E8F0",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "24px 22px 22px",
              background: "linear-gradient(135deg,#2E5BFF,#5B7BFF)",
              color: "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    opacity: 0.85,
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                  }}
                >
                  YOU&apos;RE PAYING AT
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    marginTop: 3,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {restaurant}
                </div>
              </div>
              <div
                style={{
                  textAlign: "center",
                  background: "rgba(255,255,255,0.18)",
                  borderRadius: 13,
                  padding: "9px 13px",
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.85 }}>
                  TABLE
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>
                  {tableNumber}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                marginTop: 16,
                background: "rgba(255,255,255,0.16)",
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.95)",
                  boxShadow: "0 0 0 4px rgba(255,255,255,0.18)",
                  flexShrink: 0,
                }}
              />
              Bill is live
              {otherGuests > 0
                ? ` · ${otherGuests} other phone${otherGuests === 1 ? "" : "s"} paying`
                : ""}
            </div>
          </div>

          <div style={{ padding: "20px 22px 28px" }}>
            {/* View menu / order */}
            <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
              <button
                onClick={() => {
                  setOrderOpen(false);
                  setMenuOpen((o) => !o);
                }}
                aria-expanded={menuOpen}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px",
                  background: menuOpen ? "#fff" : "#EEF2FF",
                  color: BRAND,
                  border: "1.5px solid " + (menuOpen ? BRAND : "#DBE3F4"),
                  borderRadius: 13,
                  fontFamily: "inherit",
                  fontSize: 14.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "background 200ms " + EASE + ", border-color 200ms " + EASE,
                }}
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                  <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                  <line x1="7" x2="17" y1="8" y2="8" />
                  <line x1="7" x2="17" y1="12" y2="12" />
                  <line x1="7" x2="13" y1="16" y2="16" />
                </svg>
                {menuOpen ? "Hide menu" : "View menu"}
              </button>
              {canOrder && (
                <button
                  className="qp-cta qp-press"
                  onClick={() => {
                    setMenuOpen(false);
                    setOrderOpen((o) => !o);
                  }}
                  aria-expanded={orderOpen}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "12px",
                    background: BRAND,
                    color: "#fff",
                    border: "1.5px solid transparent",
                    borderRadius: 13,
                    fontFamily: "inherit",
                    fontSize: 14.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 10px 24px rgba(46,91,255,0.3)",
                  }}
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="8" cy="21" r="1" />
                    <circle cx="19" cy="21" r="1" />
                    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                  </svg>
                  {orderOpen ? "Close order" : "Order food"}
                </button>
              )}
            </div>

            {/* Inline menu viewer (progressive disclosure, no popup). */}
            <MenuModal
              open={menuOpen}
              tableNum={tableNumber}
              token={token}
              onClose={() => setMenuOpen(false)}
            />
            {/* Inline ordering panel (progressive disclosure, no popup). */}
            {canOrder && (
              <OrderModal
                open={orderOpen}
                token={token}
                items={orderItems}
                onClose={() => setOrderOpen(false)}
                onPlaced={() => setOrderToast("Order sent to the kitchen")}
              />
            )}

            {!hasOrder ? (
              <div
                style={{
                  marginTop: 8,
                  padding: "36px 20px",
                  textAlign: "center",
                  background: "#F8FAFC",
                  border: "1px dashed #CBD5E1",
                  borderRadius: 16,
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 13,
                    background: "#EEF2FF",
                    color: BRAND,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 14px",
                  }}
                >
                  <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 2v7c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V2" />
                    <path d="M7 2v20" />
                    <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                  </svg>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>No items yet</div>
                <div
                  style={{
                    fontSize: 13.5,
                    color: "#64748B",
                    fontWeight: 500,
                    marginTop: 6,
                    lineHeight: 1.5,
                  }}
                >
                  Your server is still adding items to this table. Your bill will
                  appear here shortly.
                </div>
              </div>
            ) : (
              <>
                {/* Order summary */}
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#64748B",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Order summary
                </div>
                {items.map((it) => (
                  <div
                    key={it.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "11px 0",
                      borderBottom: "1px solid #F1F5F9",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
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
                      <span style={{ fontSize: 15, fontWeight: 600 }}>
                        {it.name}
                      </span>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>
                      {fmt(it.price)}
                    </span>
                  </div>
                ))}

                {/* Totals + shared paid/remaining */}
                <div
                  style={{
                    marginTop: 14,
                    padding: "14px 16px",
                    background: "#F8FAFC",
                    borderRadius: 14,
                  }}
                >
                  {[
                    ["Subtotal", fmt(subtotal)],
                    [`Tax (${taxRate}%)`, fmt(tax)],
                  ].map(([label, val]) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 14,
                        color: "#475569",
                        padding: "3px 0",
                      }}
                    >
                      <span>{label}</span>
                      <span style={{ fontWeight: 600, color: "#0B1221" }}>
                        {val}
                      </span>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px dashed #CBD5E1", margin: "9px 0" }} />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <span style={{ fontSize: 16, fontWeight: 800 }}>Total</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: BRAND }}>
                      {fmt(due)}
                    </span>
                  </div>
                  {paid > 0 && (
                    <>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 13.5,
                          fontWeight: 700,
                          color: "#047857",
                          marginTop: 8,
                        }}
                      >
                        <span>Paid so far</span>
                        <span>−{fmt(paid)}</span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 15,
                          fontWeight: 800,
                          marginTop: 2,
                        }}
                      >
                        <span>{fullyPaid ? "Settled" : "Remaining"}</span>
                        <span style={{ color: fullyPaid ? "#047857" : "#0B1221" }}>
                          {fmt(remaining)}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Payment result — shown in both partial and fully-paid states
                    so the payer who clears the bill still sees their receipt. */}
                {result && (
                  <div
                    aria-live="polite"
                    aria-atomic="true"
                    style={{
                      marginTop: 24,
                      padding: "16px 18px",
                      borderRadius: 16,
                      border:
                        "1px solid " + (result.cleared ? "#86EFAC" : "#FCD34D"),
                      background: result.cleared ? "#F0FDF4" : "#FFFBEB",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        fontSize: 15,
                        fontWeight: 800,
                        color: result.cleared ? "#047857" : "#B45309",
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6 9 17l-4-4" />
                      </svg>
                      Paid {fmt(result.paid)}
                    </div>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: "#475569",
                        marginTop: 6,
                      }}
                    >
                      {result.cleared || remaining <= 0.001
                        ? "Bill fully paid. Thanks!"
                        : `Payment received · ${fmt(remaining)} remaining`}
                    </div>
                  </div>
                )}

                {fullyPaid ? (
                  <div
                    style={{
                      marginTop: 22,
                      padding: "20px 18px",
                      textAlign: "center",
                      background: "#F0FDF4",
                      border: "1px solid #86EFAC",
                      borderRadius: 16,
                      color: "#047857",
                      fontWeight: 800,
                      fontSize: 16,
                    }}
                  >
                    ✓ This bill is fully paid. Thank you!
                  </div>
                ) : (
                  <>
                    {/* Split selector */}
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#64748B",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        margin: "24px 0 10px",
                      }}
                    >
                      How do you want to pay?
                    </div>
                    <div style={{ display: "flex", gap: 9 }}>
                      {SPLIT_DEFS.map((o) => {
                        const active = split === o.key;
                        const sub =
                          o.key === "full"
                            ? fmt(remaining)
                            : o.key === "equal"
                              ? fmt(perPerson) + " ea"
                              : selectedCount
                                ? fmt(itemPrincipal)
                                : "Choose";
                        return (
                          <div
                            key={o.key}
                            onClick={() => setSplit(o.key)}
                            role="button"
                            tabIndex={0}
                            aria-pressed={active}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSplit(o.key);
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: "13px 8px",
                              borderRadius: 14,
                              cursor: "pointer",
                              textAlign: "center",
                              transition: "all 220ms " + EASE,
                              border: "1.5px solid " + (active ? BRAND : "#E2E8F0"),
                              background: active ? "#EEF2FF" : "#fff",
                              color: active ? BRAND : "#0B1221",
                            }}
                          >
                            <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                              {o.label}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                marginTop: 4,
                                color: active ? BRAND : "#64748B",
                              }}
                            >
                              {sub}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Split equally controls */}
                    {split === "equal" && (
                      <div
                        style={{
                          marginTop: 11,
                          padding: "6px 16px 14px",
                          background: "#F8FAFC",
                          borderRadius: 14,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 0",
                            borderBottom: "1px solid #EEF1F6",
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>
                              People at the table
                            </div>
                            <div style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>
                              Total guests sharing the bill
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                            <button onClick={atTableDec} style={stepperBtn}>
                              −
                            </button>
                            <span
                              style={{
                                fontSize: 17,
                                fontWeight: 800,
                                minWidth: 20,
                                textAlign: "center",
                              }}
                            >
                              {peopleAtTable}
                            </span>
                            <button onClick={atTableInc} style={stepperBtn}>
                              +
                            </button>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 0",
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>
                              You&apos;re paying for
                            </div>
                            <div style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>
                              Cover yourself or a few friends
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                            <button onClick={payingDec} style={stepperBtn}>
                              −
                            </button>
                            <span
                              style={{
                                fontSize: 17,
                                fontWeight: 800,
                                minWidth: 20,
                                textAlign: "center",
                              }}
                            >
                              {clampedPaying}
                            </span>
                            <button onClick={payingInc} style={stepperBtn}>
                              +
                            </button>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "baseline",
                            marginTop: 8,
                            paddingTop: 12,
                            borderTop: "1px dashed #CBD5E1",
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 800 }}>You pay</div>
                            <div style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>
                              {equalNote} · capped at remaining
                            </div>
                          </div>
                          <span style={{ fontSize: 21, fontWeight: 800, color: BRAND }}>
                            {fmt(equalPrincipal)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Pay per item */}
                    {split === "item" && (
                      <div style={{ marginTop: 11 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#64748B",
                            marginBottom: 9,
                          }}
                        >
                          Tap the items you&apos;re paying for · paid &amp; held
                          items lock for everyone
                        </div>
                        {items.map((it, i) => {
                          const q = selectedQty[i] ?? 0;
                          const paidU = paidQty[i] ?? 0;
                          const heldOther = reservedByOthers[i];
                          const avail = available[i];
                          const itemPaid = paidU >= it.qty;
                          const noneLeft = avail <= 0;
                          const isMulti = it.qty > 1;
                          const sel = q > 0;
                          const clickable = !isMulti && !noneLeft;
                          const badge = itemPaid
                            ? { t: "Paid", c: "#047857", b: "#F0FDF4" }
                            : noneLeft && heldOther > 0
                              ? { t: "Held", c: "#B45309", b: "#FFFBEB" }
                              : null;
                          return (
                            <div
                              key={it.name}
                              onClick={
                                clickable ? () => setQty(i, sel ? 0 : 1) : undefined
                              }
                              {...(clickable
                                ? {
                                    role: "button",
                                    tabIndex: 0,
                                    "aria-pressed": sel,
                                    "aria-label": `${it.name}, ${fmt(it.price)}${
                                      sel ? ", selected" : ""
                                    }`,
                                    onKeyDown: (e: React.KeyboardEvent) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        setQty(i, sel ? 0 : 1);
                                      }
                                    },
                                  }
                                : {})}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "11px 13px",
                                borderRadius: 12,
                                cursor: clickable ? "pointer" : "default",
                                marginBottom: 7,
                                transition: "all 220ms " + EASE,
                                border: "1.5px solid " + (sel ? BRAND : "#E2E8F0"),
                                background: sel
                                  ? "#EEF2FF"
                                  : noneLeft
                                    ? "#F8FAFC"
                                    : "#fff",
                                opacity: noneLeft && !sel ? 0.65 : 1,
                              }}
                            >
                              {!isMulti && (
                                <div
                                  style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: 7,
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border:
                                      "1.5px solid " +
                                      (sel ? BRAND : itemPaid ? "#047857" : "#CBD5E1"),
                                    background: sel
                                      ? BRAND
                                      : itemPaid
                                        ? "#047857"
                                        : "#fff",
                                  }}
                                >
                                  {(sel || itemPaid) && (
                                    <svg
                                      width="13"
                                      height="13"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="#fff"
                                      strokeWidth="3.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M20 6 9 17l-4-4" />
                                    </svg>
                                  )}
                                </div>
                              )}
                              {isMulti && (
                                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setQty(i, q - 1);
                                    }}
                                    disabled={q <= 0}
                                    style={{ ...miniBtn, opacity: q <= 0 ? 0.4 : 1 }}
                                  >
                                    −
                                  </button>
                                  <span
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 800,
                                      minWidth: 46,
                                      textAlign: "center",
                                    }}
                                  >
                                    {q} / {avail}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setQty(i, q + 1);
                                    }}
                                    disabled={q >= avail}
                                    style={{ ...miniBtn, opacity: q >= avail ? 0.4 : 1 }}
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14.5, fontWeight: 600 }}>
                                  {it.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "#64748B",
                                    fontWeight: 500,
                                  }}
                                >
                                  {isMulti
                                    ? `×${it.qty} · ${fmt(unitPrice(i))} each`
                                    : fmt(it.price)}
                                  {paidU > 0 ? ` · ${paidU} paid` : ""}
                                  {heldOther > 0 ? ` · ${heldOther} held` : ""}
                                </div>
                              </div>
                              {badge ? (
                                <span
                                  style={{
                                    fontSize: 11.5,
                                    fontWeight: 800,
                                    color: badge.c,
                                    background: badge.b,
                                    padding: "3px 8px",
                                    borderRadius: 7,
                                  }}
                                >
                                  {badge.t}
                                </span>
                              ) : (
                                <span style={{ fontSize: 14, fontWeight: 700 }}>
                                  {fmt(isMulti ? unitPrice(i) * Math.max(q, 0) : it.price)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "baseline",
                            marginTop: 6,
                            padding: "12px 14px",
                            background: "#F8FAFC",
                            borderRadius: 12,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 800 }}>You pay</div>
                            <div style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>
                              {itemNote}
                            </div>
                          </div>
                          <span style={{ fontSize: 21, fontWeight: 800, color: BRAND }}>
                            {fmt(itemPrincipal)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Tip */}
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#64748B",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        margin: "24px 0 10px",
                      }}
                    >
                      Add a tip
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(5,1fr)",
                        gap: 7,
                      }}
                    >
                      {TIP_DEFS.map((o) => {
                        const active = tip === o.key;
                        return (
                          <div
                            key={o.key}
                            onClick={() => setTip(o.key)}
                            role="button"
                            tabIndex={0}
                            aria-pressed={active}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setTip(o.key);
                              }
                            }}
                            style={{
                              padding: "13px 0",
                              borderRadius: 12,
                              cursor: "pointer",
                              textAlign: "center",
                              fontSize: 13,
                              fontWeight: 700,
                              transition: "all 220ms " + EASE,
                              border: "1.5px solid " + (active ? BRAND : "#E2E8F0"),
                              background: active ? "#EEF2FF" : "#fff",
                              color: active ? BRAND : "#475569",
                            }}
                          >
                            {o.label}
                          </div>
                        );
                      })}
                    </div>
                    {isCustomTip && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginTop: 11,
                          padding: "11px 14px",
                          border: "1.5px solid #2E5BFF",
                          borderRadius: 12,
                          background: "#EEF2FF",
                        }}
                      >
                        <span style={{ fontSize: 17, fontWeight: 800, color: BRAND }}>
                          $
                        </span>
                        <input
                          type="number"
                          aria-label="Custom tip amount"
                          value={customTip}
                          onChange={(e) => {
                            setCustomTip(e.target.value);
                            setTip("custom");
                          }}
                          placeholder="0.00"
                          style={{
                            border: "none",
                            background: "transparent",
                            outline: "none",
                            fontFamily: "inherit",
                            fontSize: 17,
                            fontWeight: 700,
                            width: "100%",
                            color: "#0B1221",
                          }}
                        />
                        <span
                          style={{
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: "#64748B",
                            whiteSpace: "nowrap",
                          }}
                        >
                          custom tip
                        </span>
                      </div>
                    )}

                    {/* Apple / Google pay */}
                    <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                      <button
                        onClick={() => handlePay("Apple Pay")}
                        disabled={payDisabled}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          padding: 13,
                          background: "#000",
                          color: "#fff",
                          border: "none",
                          borderRadius: 13,
                          fontFamily: "inherit",
                          fontSize: 14.5,
                          fontWeight: 700,
                          cursor: payDisabled ? "default" : "pointer",
                          opacity: payDisabled ? 0.55 : 1,
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.05 12.04c-.02-2.05 1.68-3.04 1.75-3.09-.95-1.39-2.43-1.58-2.96-1.6-1.26-.13-2.46.74-3.1.74-.64 0-1.62-.72-2.67-.7-1.37.02-2.64.8-3.35 2.02-1.43 2.48-.37 6.15 1.02 8.16.68.99 1.49 2.1 2.55 2.06 1.03-.04 1.42-.66 2.66-.66 1.24 0 1.59.66 2.67.64 1.1-.02 1.8-1 2.48-2 .78-1.15 1.1-2.26 1.12-2.32-.02-.01-2.15-.82-2.17-3.25zM15.1 5.82c.56-.68.94-1.62.84-2.56-.81.03-1.79.54-2.37 1.22-.52.6-.98 1.56-.86 2.48.9.07 1.83-.46 2.39-1.14z" />
                        </svg>
                        Pay
                      </button>
                      <button
                        onClick={() => handlePay("Google Pay")}
                        disabled={payDisabled}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          padding: 13,
                          background: "#fff",
                          color: "#0B1221",
                          border: "1.5px solid #E2E8F0",
                          borderRadius: 13,
                          fontFamily: "inherit",
                          fontSize: 14.5,
                          fontWeight: 700,
                          cursor: payDisabled ? "default" : "pointer",
                          opacity: payDisabled ? 0.55 : 1,
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.5 12.2c0-.7-.06-1.4-.18-2.06H12v3.9h5.9c-.25 1.37-1.02 2.53-2.18 3.31v2.75h3.53c2.06-1.9 3.25-4.7 3.25-7.9z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.95 0 5.43-.98 7.24-2.65l-3.53-2.75c-.98.66-2.24 1.05-3.71 1.05-2.85 0-5.27-1.93-6.13-4.52H2.22v2.84C4.02 20.6 7.74 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.87 14.13c-.22-.66-.35-1.36-.35-2.13s.13-1.47.35-2.13V7.03H2.22C1.45 8.55 1 10.22 1 12s.45 3.45 1.22 4.97l3.65-2.84z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.35c1.6 0 3.05.55 4.18 1.63l3.13-3.13C17.43 2.1 14.95 1 12 1 7.74 1 4.02 3.4 2.22 7.03l3.65 2.84C6.73 7.28 9.15 5.35 12 5.35z"
                          />
                        </svg>
                        Pay
                      </button>
                    </div>

                    <button
                      onClick={() => handlePay("Card")}
                      disabled={payDisabled}
                      className="qp-cta-lift"
                      style={{
                        width: "100%",
                        marginTop: 11,
                        padding: 17,
                        background: BRAND,
                        color: "#fff",
                        border: "none",
                        borderRadius: 15,
                        fontFamily: "inherit",
                        fontSize: 17,
                        fontWeight: 800,
                        cursor: payDisabled ? "default" : "pointer",
                        opacity: payDisabled ? 0.55 : 1,
                        boxShadow: "0 10px 24px rgba(46,91,255,0.3)",
                        transition: "all 220ms " + EASE,
                      }}
                    >
                      {paying ? "Processing…" : payLabel}
                    </button>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 7,
                        marginTop: 14,
                        color: "#64748B",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <svg
                        aria-hidden="true"
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect width="18" height="11" x="3" y="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Secured by Nuqra · 256-bit encryption
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
