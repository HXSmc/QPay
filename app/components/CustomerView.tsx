"use client";

import { useState } from "react";
import { BRAND, fmt, TIP_PCT } from "../lib/data";
import type { OrderItem, SplitMode, TipKey } from "../lib/types";
import { MenuModal } from "./site/MenuModal";

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

export function CustomerView({
  tableNumber = "12",
  items = [],
}: {
  tableNumber?: string;
  items?: OrderItem[];
}) {
  const [split, setSplit] = useState<SplitMode>("full");
  const [tip, setTip] = useState<TipKey>("15");
  const [customTip, setCustomTip] = useState("12.00");
  const [peopleAtTable, setPeopleAtTable] = useState(4);
  const [payingFor, setPayingFor] = useState(1);
  const [selectedQty, setSelectedQty] = useState<number[]>(() =>
    items.map(() => 0),
  );
  const [menuOpen, setMenuOpen] = useState(false);

  const hasOrder = items.length > 0;

  // --- bill totals (derived from this table's order) ---
  const subtotal = +items.reduce((a, it) => a + it.price, 0).toFixed(2);
  const tax = +(subtotal * 0.08).toFixed(2);
  const base = subtotal + tax;
  const isCustomTip = tip === "custom";
  const tipAmt = isCustomTip
    ? Number(customTip) || 0
    : +(subtotal * TIP_PCT[tip]).toFixed(2);
  const total = +(base + tipAmt).toFixed(2);

  // --- split equally ---
  const clampedPaying = Math.min(payingFor, peopleAtTable);
  const perPerson = +(total / peopleAtTable).toFixed(2);
  const equalYouPay = +(perPerson * clampedPaying).toFixed(2);
  const atTableInc = () => setPeopleAtTable((p) => Math.min(p + 1, 20));
  const atTableDec = () =>
    setPeopleAtTable((p) => {
      const np = Math.max(1, p - 1);
      setPayingFor((pf) => Math.min(pf, np));
      return np;
    });
  const payingInc = () => setPayingFor((pf) => Math.min(pf + 1, peopleAtTable));
  const payingDec = () => setPayingFor((pf) => Math.max(1, pf - 1));

  // --- pay per item ---
  const unitPrice = (i: number) => items[i].price / items[i].qty;
  const itemSubtotal = items.reduce(
    (a, _it, i) => a + unitPrice(i) * (selectedQty[i] ?? 0),
    0,
  );
  const proportion = subtotal > 0 ? itemSubtotal / subtotal : 0;
  const itemYouPay = +(
    itemSubtotal +
    tax * proportion +
    tipAmt * proportion
  ).toFixed(2);
  const selectedUnits = selectedQty.reduce((a, n) => a + n, 0);
  const selectedCount = selectedQty.filter((n) => n > 0).length;
  const setQty = (i: number, q: number) =>
    setSelectedQty((sel) => {
      const next = sel.slice();
      next[i] = q;
      return next;
    });

  // --- primary pay button ---
  let payAmount = total;
  let payNote = "";
  if (split === "equal") {
    payAmount = equalYouPay;
    payNote = " (your share)";
  } else if (split === "item") {
    payAmount = itemYouPay;
    payNote = " (your items)";
  }
  const payLabel =
    split === "item" && selectedCount === 0
      ? "Select items to pay"
      : "Pay " + fmt(payAmount) + payNote;

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
      <MenuModal open={menuOpen} onClose={() => setMenuOpen(false)} />
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
                  The Copper Kitchen
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
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#4ADE80",
                }}
              />
              Bill is live · 4 guests
            </div>
          </div>

          <div style={{ padding: "20px 22px 28px" }}>
            {/* View menu */}
            <button
              onClick={() => setMenuOpen(true)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px",
                marginBottom: 18,
                background: "#EEF2FF",
                color: BRAND,
                border: "1.5px solid #DBE3F4",
                borderRadius: 13,
                fontFamily: "inherit",
                fontSize: 14.5,
                fontWeight: 700,
                cursor: "pointer",
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
              View menu
            </button>

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
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                color: "#94A3B8",
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
                <div
                  style={{ display: "flex", alignItems: "center", gap: 11 }}
                >
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

            {/* Totals */}
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
                ["Tax (8%)", fmt(tax)],
                ["Tip", fmt(tipAmt)],
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
              <div
                style={{ borderTop: "1px dashed #CBD5E1", margin: "9px 0" }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 800 }}>Total</span>
                <span
                  style={{ fontSize: 22, fontWeight: 800, color: BRAND }}
                >
                  {fmt(total)}
                </span>
              </div>
            </div>

            {/* Split selector */}
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#94A3B8",
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
                    ? fmt(total)
                    : o.key === "equal"
                      ? fmt(perPerson) + " ea"
                      : selectedCount
                        ? fmt(itemYouPay)
                        : "Choose";
                return (
                  <div
                    key={o.key}
                    onClick={() => setSplit(o.key)}
                    style={{
                      flex: 1,
                      padding: "13px 8px",
                      borderRadius: 14,
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all .15s",
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
                        color: active ? BRAND : "#94A3B8",
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
                    <div
                      style={{
                        fontSize: 12,
                        color: "#94A3B8",
                        fontWeight: 500,
                      }}
                    >
                      Total guests sharing the bill
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 13,
                    }}
                  >
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
                    <div
                      style={{
                        fontSize: 12,
                        color: "#94A3B8",
                        fontWeight: 500,
                      }}
                    >
                      Cover yourself or a few friends
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 13,
                    }}
                  >
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
                    <div
                      style={{
                        fontSize: 12,
                        color: "#94A3B8",
                        fontWeight: 500,
                      }}
                    >
                      {equalNote}
                    </div>
                  </div>
                  <span
                    style={{ fontSize: 21, fontWeight: 800, color: BRAND }}
                  >
                    {fmt(equalYouPay)}
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
                    color: "#94A3B8",
                    marginBottom: 9,
                  }}
                >
                  Tap the items you&apos;re paying for
                </div>
                {items.map((it, i) => {
                  const q = selectedQty[i];
                  const sel = q > 0;
                  const isMulti = it.qty > 1;
                  return (
                    <div
                      key={it.name}
                      onClick={
                        isMulti ? undefined : () => setQty(i, sel ? 0 : 1)
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "11px 13px",
                        borderRadius: 12,
                        cursor: isMulti ? "default" : "pointer",
                        marginBottom: 7,
                        transition: "all .15s",
                        border: "1.5px solid " + (sel ? BRAND : "#E2E8F0"),
                        background: sel ? "#EEF2FF" : "#fff",
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
                              "1.5px solid " + (sel ? BRAND : "#CBD5E1"),
                            background: sel ? BRAND : "#fff",
                          }}
                        >
                          {sel && (
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
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 9,
                          }}
                        >
                          <button
                            onClick={() => setQty(i, Math.max(q - 1, 0))}
                            style={{
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
                            }}
                          >
                            −
                          </button>
                          <span
                            style={{
                              fontSize: 13.5,
                              fontWeight: 800,
                              minWidth: 34,
                              textAlign: "center",
                            }}
                          >
                            {q} / {it.qty}
                          </span>
                          <button
                            onClick={() => setQty(i, Math.min(q + 1, it.qty))}
                            style={{
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
                            }}
                          >
                            +
                          </button>
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 600 }}>
                          {it.name}
                        </div>
                        {isMulti && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#94A3B8",
                              fontWeight: 500,
                            }}
                          >
                            ×{it.qty} ordered · {fmt(unitPrice(i))} each
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>
                        {fmt(it.price)}
                      </span>
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
                    <div
                      style={{
                        fontSize: 12,
                        color: "#94A3B8",
                        fontWeight: 500,
                      }}
                    >
                      {itemNote}
                    </div>
                  </div>
                  <span
                    style={{ fontSize: 21, fontWeight: 800, color: BRAND }}
                  >
                    {fmt(itemYouPay)}
                  </span>
                </div>
              </div>
            )}

            {/* Tip */}
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#94A3B8",
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
                    style={{
                      padding: "13px 0",
                      borderRadius: 12,
                      cursor: "pointer",
                      textAlign: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      transition: "all .15s",
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
                <span
                  style={{ fontSize: 17, fontWeight: 800, color: BRAND }}
                >
                  $
                </span>
                <input
                  type="number"
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
                  cursor: "pointer",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.05 12.04c-.02-2.05 1.68-3.04 1.75-3.09-.95-1.39-2.43-1.58-2.96-1.6-1.26-.13-2.46.74-3.1.74-.64 0-1.62-.72-2.67-.7-1.37.02-2.64.8-3.35 2.02-1.43 2.48-.37 6.15 1.02 8.16.68.99 1.49 2.1 2.55 2.06 1.03-.04 1.42-.66 2.66-.66 1.24 0 1.59.66 2.67.64 1.1-.02 1.8-1 2.48-2 .78-1.15 1.1-2.26 1.12-2.32-.02-.01-2.15-.82-2.17-3.25zM15.1 5.82c.56-.68.94-1.62.84-2.56-.81.03-1.79.54-2.37 1.22-.52.6-.98 1.56-.86 2.48.9.07 1.83-.46 2.39-1.14z" />
                </svg>
                Pay
              </button>
              <button
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
                  cursor: "pointer",
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
                cursor: "pointer",
                boxShadow: "0 10px 24px rgba(46,91,255,0.3)",
                transition: "all .15s",
              }}
            >
              {payLabel}
            </button>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                marginTop: 14,
                color: "#94A3B8",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <svg
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
              Secured by QPay · 256-bit encryption
            </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
