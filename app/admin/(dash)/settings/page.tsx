"use client";

import { useEffect, useState } from "react";
import { getMe, getSettings, saveSettings } from "../../../lib/api";
import { C, R, S, T, STATUS, SHADOW, btn, card, field } from "../../../lib/theme";
import { Alert, Spinner, Toast } from "../../../components/ui/Primitives";
import { CURRENCIES, type Currency } from "../../../lib/data";
import { useT } from "../../../lib/i18n-client";

const CURRENCY_LABELS: Record<Currency, string> = {
  USD: "USD (US Dollar $)",
  GBP: "GBP (British Pound £)",
  EUR: "EUR (Euro €)",
  SAR: "SAR (Saudi Riyal)",
};

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
          boxShadow: SHADOW.e1,
        }}
      />
    </span>
  );
}

export default function SettingsPage() {
  const tr = useT();
  const [restaurant, setRestaurant] = useState("");
  const [taxRate, setTaxRate] = useState("8");
  const [currency, setCurrency] = useState<Currency>("USD");
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
        setCurrency(s.currency);
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
        currency,
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
      <h1 style={{ ...T.h1, margin: 0 }}>{tr("Settings")}</h1>
      <p style={{ ...T.body, color: C.muted, margin: `${S[1]}px 0 ${S[5]}px` }}>
        {tr("Restaurant profile and payment preferences.")}
      </p>

      <div style={card({ pad: S[5] })}>
        <div style={{ display: "flex", flexDirection: "column", gap: S[4] }}>
          <div>
            <label htmlFor="set-restaurant" style={labelStyle}>
              {tr("Restaurant name")}
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
              {tr("Tax rate (%)")}
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

          {taxError && <Alert kind="danger">{tr(taxError)}</Alert>}

          <div>
            <label htmlFor="set-currency" style={labelStyle}>
              {tr("Currency")}
            </label>
            <select
              id="set-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              style={field()}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {tr(CURRENCY_LABELS[c])}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={row}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>{tr("Automatic receipts")}</div>
            <div style={{ ...T.caption, color: C.muted, fontWeight: 500 }}>
              {tr("Email or SMS receipt after each payment")}
            </div>
          </div>
          <Toggle on={autoReceipts} onToggle={() => setAutoReceipts((v) => !v)} label={tr("Automatic receipts")} />
        </div>
        <div style={row}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>{tr("Tip prompts")}</div>
            <div style={{ ...T.caption, color: C.muted, fontWeight: 500 }}>
              {tr("Show tip suggestions at checkout")}
            </div>
          </div>
          <Toggle on={tipPrompts} onToggle={() => setTipPrompts((v) => !v)} label={tr("Tip prompts")} />
        </div>

        <button
          onClick={save}
          disabled={saving || loading}
          className="qp-cta"
          style={{ ...btn("primary", { size: "lg", disabled: saving || loading }), marginTop: S[5] }}
        >
          {saving && <Spinner size={15} color="#fff" />}
          {saving ? tr("Saving.") : tr("Save changes")}
        </button>

        {error && <div style={{ marginTop: S[3] }}><Alert kind="danger">{tr(error)}</Alert></div>}
      </div>

      {saved && (
        <Toast message={tr("Settings saved.")} kind="success" onDone={() => setSaved(false)} />
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
