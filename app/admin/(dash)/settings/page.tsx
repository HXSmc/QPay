"use client";

import { useState } from "react";
import { BRAND } from "../../../lib/data";

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        width: 46,
        height: 26,
        borderRadius: 999,
        border: "none",
        cursor: "pointer",
        background: on ? BRAND : "#CBD5E1",
        position: "relative",
        transition: "background .15s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 23 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          transition: "left .15s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [restaurant, setRestaurant] = useState("The Copper Kitchen");
  const [taxRate, setTaxRate] = useState("8");
  const [autoReceipts, setAutoReceipts] = useState(true);
  const [tipPrompts, setTipPrompts] = useState(true);
  const [saved, setSaved] = useState(false);

  const field = {
    width: "100%",
    padding: "11px 13px",
    border: "1.5px solid #E2E8F0",
    borderRadius: 11,
    fontFamily: "inherit",
    fontSize: 14.5,
    outline: "none",
    color: "#0B1221",
    background: "#fff",
  } as const;

  const row = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 0",
    borderTop: "1px solid #F1F5F9",
  } as const;

  return (
    <div className="qp-page" style={{ padding: "30px 36px", maxWidth: 640 }}>
      <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
        Settings
      </h1>
      <p style={{ fontSize: 14, color: "#64748B", margin: "5px 0 24px", fontWeight: 600 }}>
        Restaurant profile and payment preferences.
      </p>

      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 18, padding: 24 }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Restaurant name</label>
        <input value={restaurant} onChange={(e) => setRestaurant(e.target.value)} style={{ ...field, margin: "8px 0 16px" }} />

        <label style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Tax rate (%)</label>
        <input value={taxRate} onChange={(e) => setTaxRate(e.target.value)} inputMode="decimal" style={{ ...field, margin: "8px 0 4px" }} />

        <div style={row}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>Automatic receipts</div>
            <div style={{ fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>Email/SMS receipt after each payment</div>
          </div>
          <Toggle on={autoReceipts} onClick={() => setAutoReceipts((v) => !v)} />
        </div>
        <div style={row}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>Tip prompts</div>
            <div style={{ fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>Show tip suggestions at checkout</div>
          </div>
          <Toggle on={tipPrompts} onClick={() => setTipPrompts((v) => !v)} />
        </div>

        <button
          onClick={() => {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
          style={{
            marginTop: 22,
            padding: "12px 22px",
            background: BRAND,
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontFamily: "inherit",
            fontSize: 14.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {saved ? "Saved ✓" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
