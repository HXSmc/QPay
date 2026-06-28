"use client";

import { useEffect, useState } from "react";
import { getMe, getSettings, saveSettings } from "../../../lib/api";
import { C, R, S, T, STATUS, card, field } from "../../../lib/theme";
import { Alert, Spinner, Toast } from "../../../components/ui/Primitives";

function Toggle({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <span
      role="switch"
      aria-checked={on}
      aria-label={label}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onToggle();
        }
      }}
      style={{
        display: "inline-block",
        width: 46,
        height: 26,
        borderRadius: R.pill,
        cursor: "pointer",
        background: on ? C.brand : C.borderStrong,
        position: "relative",
        transition: "background .15s",
        flexShrink: 0,
        outlineOffset: 2,
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
    </span>
  );
}

export default function SettingsPage() {
  const [restaurant, setRestaurant] = useState("");
  const [taxRate, setTaxRate] = useState("8");
  const [autoReceipts, setAutoReceipts] = useState(true);
  const [tipPrompts, setTipPrompts] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [taxError, setTaxError] = useState("");

  useEffect(() => {
    getSettings()
      .then(async (s) => {
        let name = s.name;
        if (!name) {
          try {
            const me = await getMe();
            name = me.email.split("@")[0];
          } catch {
            /* leave name empty */
          }
        }
        setRestaurant(name);
        setTaxRate(String(s.taxRate));
        setAutoReceipts(s.autoReceipts);
        setTipPrompts(s.tipPrompts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    const rate = Number(taxRate);
    if (taxRate.trim() === "" || Number.isNaN(rate) || rate < 0 || rate > 30) {
      setTaxError("Tax rate must be a number between 0 and 30.");
      return;
    }
    setTaxError("");
    setSaving(true);
    setError("");
    try {
      await saveSettings({
        name: restaurant.trim(),
        taxRate: Number(taxRate),
        autoReceipts,
        tipPrompts,
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Please retry.");
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = { ...T.label, color: C.muted, display: "block", marginBottom: S[2] } as const;

  return (
    <div className="qp-page" style={{ padding: `${S[6]}px ${S[6]}px`, maxWidth: 640 }}>
      <h1 style={{ ...T.h1, margin: 0 }}>Settings</h1>
      <p style={{ ...T.body, color: C.muted, margin: `${S[1]}px 0 ${S[5]}px` }}>
        Restaurant profile and payment preferences.
      </p>

      <div style={card({ pad: S[5] })}>
        <div style={{ display: "flex", flexDirection: "column", gap: S[4] }}>
          <div>
            <label htmlFor="set-restaurant" style={labelStyle}>
              Restaurant name
            </label>
            <input
              id="set-restaurant"
              value={restaurant}
              onChange={(e) => setRestaurant(e.target.value)}
              style={field()}
            />
          </div>

          <div>
            <label htmlFor="set-taxrate" style={labelStyle}>
              Tax rate (%)
            </label>
            <input
              id="set-taxrate"
              value={taxRate}
              onChange={(e) => {
                setTaxRate(e.target.value);
                if (taxError) setTaxError("");
              }}
              inputMode="decimal"
              aria-invalid={!!taxError}
              style={{
                ...field(),
                borderColor: taxError ? STATUS.danger.border : C.border,
              }}
            />
          </div>

          {taxError && <Alert kind="danger">{taxError}</Alert>}
        </div>

        <div style={row}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>Automatic receipts</div>
            <div style={{ ...T.caption, color: C.muted, fontWeight: 500 }}>
              Email or SMS receipt after each payment
            </div>
          </div>
          <Toggle on={autoReceipts} onToggle={() => setAutoReceipts((v) => !v)} label="Automatic receipts" />
        </div>
        <div style={row}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>Tip prompts</div>
            <div style={{ ...T.caption, color: C.muted, fontWeight: 500 }}>
              Show tip suggestions at checkout
            </div>
          </div>
          <Toggle on={tipPrompts} onToggle={() => setTipPrompts((v) => !v)} label="Tip prompts" />
        </div>

        <button
          onClick={save}
          disabled={saving || loading}
          className="qp-cta"
          style={{
            marginTop: S[5],
            display: "inline-flex",
            alignItems: "center",
            gap: S[2],
            padding: "12px 22px",
            background: C.brand,
            color: "#fff",
            border: "none",
            borderRadius: R.md,
            fontFamily: "inherit",
            fontSize: 14.5,
            fontWeight: 700,
            cursor: saving || loading ? "default" : "pointer",
            opacity: saving || loading ? 0.7 : 1,
          }}
        >
          {saving && <Spinner size={15} color="#fff" />}
          {saving ? "Saving." : "Save changes"}
        </button>

        {error && <div style={{ marginTop: S[3] }}><Alert kind="danger">{error}</Alert></div>}
      </div>

      {saved && (
        <Toast message="Settings saved." kind="success" onDone={() => setSaved(false)} />
      )}
    </div>
  );
}

const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `${S[4]}px 0`,
  borderTop: `1px solid ${C.canvas}`,
};
