"use client";

import { useEffect, useRef, useState } from "react";
import { billDue, fmt, TIP_PCT } from "../lib/data";
import { getPublicMenuItems, payTable, syncTable } from "../lib/api";
import type { LiveTable, MenuItem, SplitMode, TipKey } from "../lib/types";
import { C, R, S, SHADOW, T, MONO, STATUS } from "../lib/theme";
import { MenuModal } from "./site/MenuModal";
import { OrderModal } from "./site/OrderModal";
import { Toast } from "./ui/Primitives";

// Calm shared easing for inline reveals and state transitions.
const EASE = "cubic-bezier(0.16,1,0.3,1)";

// Reduced-motion gate for any JS-driven motion (the live-indicator pulse).
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

// Money cell: every monetary figure renders in the monospace "ledger" face.
function Money({
  value,
  size = 15,
  weight = 600,
  color = C.text,
}: {
  value: number | string;
  size?: number;
  weight?: number;
  color?: string;
}) {
  return (
    <span style={{ ...MONO, fontSize: size, fontWeight: weight, color }}>
      {typeof value === "number" ? fmt(value) : value}
    </span>
  );
}

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
      amount: "0.00",
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

  const reduced = usePrefersReducedMotion();

  const stepperBtn = {
    width: 34,
    height: 34,
    borderRadius: R.sm,
    border: `1.5px solid ${C.border}`,
    background: C.surface,
    color: C.brand,
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
    borderRadius: R.xs,
    border: `1.5px solid ${C.borderStrong}`,
    background: C.surface,
    color: C.brand,
    fontFamily: "inherit",
    fontSize: 17,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  } as const;

  // Shared section eyebrow (uppercase, muted for AA, generous tracking).
  const sectionLabel = {
    fontSize: 12,
    fontWeight: 700,
    color: C.muted,
    letterSpacing: "0.09em",
    textTransform: "uppercase" as const,
  };

  return (
    <div
      style={{
        minHeight: "calc(100vh - 60px)",
        background: `radial-gradient(120% 80% at 50% 0%, ${C.surfaceAlt}, ${C.canvas} 60%)`,
        display: "flex",
        justifyContent: "center",
        padding: "40px 16px 56px",
      }}
    >
      {/* Self-contained pulse for the live indicator dot (gated by JS below). */}
      <style>{`@keyframes qpv-livepulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.45)}}`}</style>

      {orderToast && (
        <Toast message={orderToast} kind="success" onDone={() => setOrderToast("")} />
      )}

      <div style={{ width: "100%", maxWidth: 420 }}>
        <div
          style={{
            background: C.surface,
            borderRadius: R.xl,
            overflow: "hidden",
            boxShadow: SHADOW.e3,
            border: `1px solid ${C.border}`,
          }}
        >
          {/* Header — dark ink band with a single ember accent */}
          <div
            style={{
              position: "relative",
              padding: `${S[5]}px ${S[5]}px ${S[5]}px`,
              background: `linear-gradient(150deg, ${C.ink}, ${C.inkSoft})`,
              color: "#fff",
            }}
          >
            {/* Ember hairline anchoring the band to the brand accent */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 2,
                background: C.brand,
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: S[4],
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: C.brandLight,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}
                >
                  Your bill at
                </div>
                <div
                  style={{
                    ...T.h1,
                    fontSize: 26,
                    color: "#fff",
                    marginTop: 6,
                    overflowWrap: "break-word",
                  }}
                >
                  {restaurant}
                </div>
              </div>
              <div
                style={{
                  textAlign: "center",
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${C.brand}`,
                  borderRadius: R.md,
                  padding: "8px 14px",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: C.brandLight,
                  }}
                >
                  TABLE
                </div>
                <div style={{ ...MONO, fontSize: 24, fontWeight: 700, lineHeight: 1.05, color: "#fff" }}>
                  {tableNumber}
                </div>
              </div>
            </div>

            {/* Live indicator — calm ember pulse dot + label on the dark band */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginTop: S[4],
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.14)",
                padding: "6px 13px",
                borderRadius: R.pill,
                fontSize: 12.5,
                fontWeight: 600,
                color: "rgba(255,255,255,0.92)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: C.brand,
                  flexShrink: 0,
                  animation: reduced ? undefined : "qpv-livepulse 2.4s ease-in-out infinite",
                }}
              />
              Live bill
              {otherGuests > 0
                ? `, ${otherGuests} other phone${otherGuests === 1 ? "" : "s"} paying`
                : ""}
            </div>
          </div>

          <div style={{ padding: `${S[5]}px ${S[5]}px ${S[6]}px` }}>
            {/* View menu / order food */}
            <div style={{ display: "flex", gap: S[2], marginBottom: S[4] }}>
              <button
                onClick={() => {
                  setOrderOpen(false);
                  setMenuOpen((o) => !o);
                }}
                aria-expanded={menuOpen}
                className="qp-press"
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px",
                  background: menuOpen ? C.brandTint : C.surface,
                  color: C.brand,
                  border: `1.5px solid ${menuOpen ? C.brand : C.borderStrong}`,
                  borderRadius: R.md,
                  fontFamily: "inherit",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: `background 200ms ${EASE}, border-color 200ms ${EASE}`,
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
                    background: C.brand,
                    color: "#fff",
                    border: "1.5px solid transparent",
                    borderRadius: R.md,
                    fontFamily: "inherit",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: SHADOW.cta,
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
                  marginTop: S[2],
                  padding: "40px 24px",
                  textAlign: "center",
                  background: C.surfaceAlt,
                  border: `1px dashed ${C.borderStrong}`,
                  borderRadius: R.lg,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: R.md,
                    background: C.brandTint,
                    color: C.brand,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 2v7c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V2" />
                    <path d="M7 2v20" />
                    <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                  </svg>
                </div>
                <div style={{ ...T.h2, color: C.text }}>No items yet</div>
                <div
                  style={{
                    ...T.body,
                    fontSize: 13.5,
                    color: C.muted,
                    marginTop: 6,
                    maxWidth: 280,
                    marginInline: "auto",
                  }}
                >
                  Your server is still adding items to this table. Your bill will
                  appear here shortly.
                </div>
              </div>
            ) : (
              <>
                {/* Order summary */}
                <div style={{ ...sectionLabel, marginBottom: S[2] }}>Order summary</div>
                {items.map((it) => (
                  <div
                    key={it.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "11px 0",
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span
                        style={{
                          ...MONO,
                          minWidth: 26,
                          height: 26,
                          padding: "0 6px",
                          borderRadius: R.xs,
                          background: C.brandTint,
                          color: C.brand,
                          fontSize: 13,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {it.qty}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
                        {it.name}
                      </span>
                    </div>
                    <Money value={it.price} size={15} weight={600} />
                  </div>
                ))}

                {/* Totals + shared paid/remaining */}
                <div
                  style={{
                    marginTop: S[4],
                    padding: "16px 18px",
                    background: C.surfaceAlt,
                    border: `1px solid ${C.border}`,
                    borderRadius: R.lg,
                  }}
                >
                  {[
                    ["Subtotal", subtotal],
                    [`Tax (${taxRate}%)`, tax],
                  ].map(([label, val]) => (
                    <div
                      key={String(label)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        fontSize: 14,
                        color: C.muted,
                        padding: "3px 0",
                      }}
                    >
                      <span>{label}</span>
                      <Money value={val as number} size={14} weight={600} />
                    </div>
                  ))}
                  <div style={{ borderTop: `1px dashed ${C.borderStrong}`, margin: "11px 0" }} />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <span style={{ ...T.h3, fontSize: 16, color: C.text }}>Total</span>
                    <Money value={due} size={24} weight={700} color={C.brand} />
                  </div>
                  {paid > 0 && (
                    <>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: STATUS.success.fg,
                          marginTop: 10,
                        }}
                      >
                        <span>Paid so far</span>
                        <Money value={"-" + fmt(paid)} size={13.5} weight={700} color={STATUS.success.fg} />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          fontSize: 15,
                          fontWeight: 700,
                          color: C.text,
                          marginTop: 3,
                        }}
                      >
                        <span>{fullyPaid ? "Settled" : "Remaining"}</span>
                        <Money
                          value={remaining}
                          size={16}
                          weight={700}
                          color={fullyPaid ? STATUS.success.fg : C.text}
                        />
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
                      marginTop: S[5],
                      padding: "16px 18px",
                      borderRadius: R.lg,
                      border: `1px solid ${result.cleared ? STATUS.success.border : STATUS.warn.border}`,
                      background: result.cleared ? STATUS.success.bg : STATUS.warn.bg,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        fontSize: 15,
                        fontWeight: 700,
                        color: result.cleared ? STATUS.success.fg : STATUS.warn.fg,
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
                      <span>Paid </span>
                      <Money
                        value={result.paid}
                        size={15}
                        weight={700}
                        color={result.cleared ? STATUS.success.fg : STATUS.warn.fg}
                      />
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: C.muted, marginTop: 6 }}>
                      {result.cleared || remaining <= 0.001 ? (
                        "Bill fully paid. Thanks!"
                      ) : (
                        <>
                          Payment received, <Money value={remaining} size={13.5} weight={600} color={C.muted} /> remaining
                        </>
                      )}
                    </div>
                  </div>
                )}

                {fullyPaid ? (
                  <div
                    style={{
                      marginTop: S[5],
                      padding: "22px 18px",
                      textAlign: "center",
                      background: STATUS.success.bg,
                      border: `1px solid ${STATUS.success.border}`,
                      borderRadius: R.lg,
                      color: STATUS.success.fg,
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  >
                    This bill is fully paid. Thank you.
                  </div>
                ) : (
                  <>
                    {/* Split selector */}
                    <div style={{ ...sectionLabel, margin: `${S[5]}px 0 ${S[3]}px` }}>
                      How do you want to pay?
                    </div>
                    <div style={{ display: "flex", gap: S[2] }}>
                      {SPLIT_DEFS.map((o) => {
                        const active = split === o.key;
                        const subColor = active ? C.brand : C.muted;
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
                              borderRadius: R.md,
                              cursor: "pointer",
                              textAlign: "center",
                              transition: `all 220ms ${EASE}`,
                              border: `1.5px solid ${active ? C.brand : C.border}`,
                              background: active ? C.brandTint : C.surface,
                              color: active ? C.brand : C.text,
                            }}
                          >
                            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{o.label}</div>
                            <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600 }}>
                              {o.key === "full" ? (
                                <Money value={remaining} size={12} weight={600} color={subColor} />
                              ) : o.key === "equal" ? (
                                <>
                                  <Money value={perPerson} size={12} weight={600} color={subColor} /> ea
                                </>
                              ) : selectedCount ? (
                                <Money value={itemPrincipal} size={12} weight={600} color={subColor} />
                              ) : (
                                <span style={{ color: subColor }}>Choose</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Split equally controls */}
                    {split === "equal" && (
                      <div
                        style={{
                          marginTop: S[3],
                          padding: "6px 16px 14px",
                          background: C.surfaceAlt,
                          border: `1px solid ${C.border}`,
                          borderRadius: R.lg,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "12px 0",
                            borderBottom: `1px solid ${C.border}`,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                              People at the table
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                            <button onClick={atTableDec} aria-label="Fewer people" style={stepperBtn}>
                              −
                            </button>
                            <span style={{ ...MONO, fontSize: 17, fontWeight: 700, minWidth: 22, textAlign: "center", color: C.text }}>
                              {peopleAtTable}
                            </span>
                            <button onClick={atTableInc} aria-label="More people" style={stepperBtn}>
                              +
                            </button>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "12px 0",
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                              You&apos;re paying for
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                            <button onClick={payingDec} aria-label="Pay for fewer" style={stepperBtn}>
                              −
                            </button>
                            <span style={{ ...MONO, fontSize: 17, fontWeight: 700, minWidth: 22, textAlign: "center", color: C.text }}>
                              {clampedPaying}
                            </span>
                            <button onClick={payingInc} aria-label="Pay for more" style={stepperBtn}>
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
                            borderTop: `1px dashed ${C.borderStrong}`,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>You pay</div>
                            <div style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>
                              {equalNote}, capped at remaining
                            </div>
                          </div>
                          <Money value={equalPrincipal} size={21} weight={700} color={C.brand} />
                        </div>
                      </div>
                    )}

                    {/* Pay per item */}
                    {split === "item" && (
                      <div style={{ marginTop: S[3] }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: C.muted, marginBottom: S[2] }}>
                          Tap the items you&apos;re paying for. Paid &amp; held items lock for everyone.
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
                          const lineBadge = itemPaid
                            ? { t: "Paid", s: STATUS.success }
                            : noneLeft && heldOther > 0
                              ? { t: "Held", s: STATUS.warn }
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
                                borderRadius: R.md,
                                cursor: clickable ? "pointer" : "default",
                                marginBottom: 7,
                                transition: `all 220ms ${EASE}`,
                                border: `1.5px solid ${sel ? C.brand : C.border}`,
                                background: sel
                                  ? C.brandTint
                                  : noneLeft
                                    ? C.surfaceAlt
                                    : C.surface,
                                opacity: noneLeft && !sel ? 0.65 : 1,
                              }}
                            >
                              {!isMulti && (
                                <div
                                  style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: R.xs,
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: `1.5px solid ${sel ? C.brand : itemPaid ? C.brand : C.borderStrong}`,
                                    background: sel ? C.brand : itemPaid ? C.brand : C.surface,
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
                                    aria-label="Remove one"
                                    style={{ ...miniBtn, opacity: q <= 0 ? 0.4 : 1 }}
                                  >
                                    −
                                  </button>
                                  <span style={{ ...MONO, fontSize: 13, fontWeight: 700, minWidth: 46, textAlign: "center", color: C.text }}>
                                    {q} / {avail}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setQty(i, q + 1);
                                    }}
                                    disabled={q >= avail}
                                    aria-label="Add one"
                                    style={{ ...miniBtn, opacity: q >= avail ? 0.4 : 1 }}
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14.5, fontWeight: 600, color: C.text }}>
                                  {it.name}
                                </div>
                                <div style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>
                                  {isMulti
                                    ? `${it.qty} at ${fmt(unitPrice(i))} each`
                                    : fmt(it.price)}
                                  {paidU > 0 ? `, ${paidU} paid` : ""}
                                  {heldOther > 0 ? `, ${heldOther} held` : ""}
                                </div>
                              </div>
                              {lineBadge ? (
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    letterSpacing: "0.03em",
                                    textTransform: "uppercase",
                                    color: lineBadge.s.fg,
                                    background: lineBadge.s.bg,
                                    border: `1px solid ${lineBadge.s.border}`,
                                    padding: "3px 8px",
                                    borderRadius: R.pill,
                                  }}
                                >
                                  {lineBadge.t}
                                </span>
                              ) : (
                                <Money
                                  value={isMulti ? unitPrice(i) * Math.max(q, 0) : it.price}
                                  size={14}
                                  weight={700}
                                />
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
                            background: C.surfaceAlt,
                            border: `1px solid ${C.border}`,
                            borderRadius: R.md,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>You pay</div>
                            <div style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>
                              {itemNote}
                            </div>
                          </div>
                          <Money value={itemPrincipal} size={21} weight={700} color={C.brand} />
                        </div>
                      </div>
                    )}

                    {/* Tip */}
                    <div style={{ ...sectionLabel, margin: `${S[5]}px 0 ${S[3]}px` }}>Add a tip</div>
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
                              borderRadius: R.md,
                              cursor: "pointer",
                              textAlign: "center",
                              fontSize: 13,
                              fontWeight: 700,
                              transition: `all 220ms ${EASE}`,
                              border: `1.5px solid ${active ? C.brand : C.border}`,
                              background: active ? C.brandTint : C.surface,
                              color: active ? C.brand : C.muted,
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
                          marginTop: S[3],
                          padding: "11px 14px",
                          border: `1.5px solid ${C.brand}`,
                          borderRadius: R.md,
                          background: C.brandTint,
                        }}
                      >
                        <span style={{ ...MONO, fontSize: 17, fontWeight: 700, color: C.brand }}>
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
                            ...MONO,
                            border: "none",
                            background: "transparent",
                            outline: "none",
                            fontSize: 17,
                            fontWeight: 700,
                            width: "100%",
                            color: C.text,
                          }}
                        />
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: C.muted, whiteSpace: "nowrap" }}>
                          custom tip
                        </span>
                      </div>
                    )}

                    {/* Apple / Google pay */}
                    <div style={{ display: "flex", gap: S[2], marginTop: S[5] }}>
                      <button
                        onClick={() => handlePay("Apple Pay")}
                        disabled={payDisabled}
                        className="qp-press"
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          padding: 13,
                          background: C.ink,
                          color: "#fff",
                          border: "none",
                          borderRadius: R.md,
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
                        className="qp-press"
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          padding: 13,
                          background: C.surface,
                          color: C.text,
                          border: `1.5px solid ${C.borderStrong}`,
                          borderRadius: R.md,
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
                      aria-label={payLabel}
                      style={{
                        width: "100%",
                        marginTop: S[2],
                        padding: 17,
                        background: C.brand,
                        color: "#fff",
                        border: "none",
                        borderRadius: R.md,
                        fontFamily: "inherit",
                        fontSize: 17,
                        fontWeight: 700,
                        cursor: payDisabled ? "default" : "pointer",
                        opacity: payDisabled ? 0.55 : 1,
                        boxShadow: SHADOW.cta,
                        transition: `all 220ms ${EASE}`,
                      }}
                    >
                      {paying ? (
                        "Processing."
                      ) : fullyPaid ? (
                        "Bill fully paid"
                      ) : split === "item" && selectedCount === 0 ? (
                        "Select items to pay"
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}>
                          Pay <Money value={payAmount} size={17} weight={700} color="#fff" />
                          {payNote}
                        </span>
                      )}
                    </button>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 7,
                        marginTop: S[3],
                        color: C.muted,
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
                      Secured by Nuqra, 256-bit encryption
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
