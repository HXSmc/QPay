"use client";

import { useEffect, useRef, useState } from "react";
import { getMe, getSettings, saveSettings, testPosConnection, type PosTestResult } from "../../../lib/api";
import { C, R, S, T, STATUS, SHADOW, btn, card, field } from "../../../lib/theme";
import { Alert, Spinner, Toast } from "../../../components/ui/Primitives";
import { CURRENCIES, type Currency } from "../../../lib/data";
import { useT } from "../../../lib/i18n-client";
import { POS_SYSTEMS, posConnection, posFields } from "../../../lib/pos";
import { badge } from "../../../lib/theme";

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
        boxSizing: "border-box",
        width: 46,
        height: 26,
        borderRadius: R.pill,
        cursor: "pointer",
        background: on ? C.brand : C.surfaceAlt,
        // Off-track needs a 3:1 boundary vs the white card (WCAG 1.4.11).
        border: on ? "1px solid transparent" : "1px solid #8A93A0",
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
  const [tables, setTables] = useState("");
  const [branches, setBranches] = useState("");
  const [posSystem, setPosSystem] = useState("");
  const [posConfig, setPosConfig] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);
  const [posTest, setPosTest] = useState<PosTestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [taxError, setTaxError] = useState("");
  // Branch count at load — if it changes on save we reload so the Branches nav
  // and per-branch table tabs (driven by this count) update immediately.
  const branchesAtLoad = useRef(0);

  useEffect(() => {
    getSettings()
      .then(async (s) => {
        branchesAtLoad.current = s.branches ?? 0;
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
        setTables(s.tables ? String(s.tables) : "");
        setBranches(s.branches ? String(s.branches) : "");
        setPosSystem(s.posSystem ?? "");
        setPosConfig(s.posConfig ?? {});
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
        tables: tables ? Number(tables) : 0,
        branches: branches ? Number(branches) : 0,
        posSystem,
        posConfig,
      });
      setSaved(true);
      const nb = branches ? Number(branches) : 0;
      if (nb !== branchesAtLoad.current) {
        // Branch count changed → server provisioned/updated branches; reload so
        // the sidebar Branches link and the Tables branch tabs reflect it.
        branchesAtLoad.current = nb;
        window.location.reload();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Please retry.");
    } finally {
      setSaving(false);
    }
  };

  // Save first (so the latest, encrypted credentials persist) then run a real
  // read-only verification against the POS API.
  const runTest = async () => {
    setTesting(true);
    setPosTest(null);
    try {
      await saveSettings({ posSystem, posConfig });
      setPosTest(await testPosConnection());
    } catch {
      setPosTest({ ok: false, automated: true, message: "Couldn't test the connection." });
    } finally {
      setTesting(false);
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
              disabled={loading}
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
              disabled={loading}
              onChange={(e) => {
                setTaxRate(e.target.value);
                if (taxError) setTaxError("");
              }}
              inputMode="decimal"
              aria-invalid={!!taxError}
              style={{
                ...field(),
                // Override the whole `border` shorthand (not borderColor) so it
                // doesn't mix shorthand+longhand, and keep field()'s AA border
                // when there's no error.
                ...(taxError ? { border: `1px solid ${STATUS.danger.border}` } : {}),
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
              disabled={loading}
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: S[4] }}>
            <div>
              <label htmlFor="set-tables" style={labelStyle}>
                {tr("Number of tables")}
              </label>
              <input
                id="set-tables"
                type="number"
                min={0}
                inputMode="numeric"
                disabled={loading}
                value={tables}
                onChange={(e) => setTables(e.target.value)}
                style={field()}
              />
            </div>
            <div>
              <label htmlFor="set-branches" style={labelStyle}>
                {tr("Number of branches")}
              </label>
              <input
                id="set-branches"
                type="number"
                min={0}
                inputMode="numeric"
                disabled={loading}
                value={branches}
                onChange={(e) => setBranches(e.target.value)}
                style={field()}
              />
            </div>
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

        {/* POS integration: pick the system, then fill the credentials it needs.
            Saved with the rest of the form by the Save button below. */}
        <div style={{ borderTop: `1px solid ${C.canvas}`, marginTop: S[4], paddingTop: S[5] }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: S[3],
              marginBottom: S[2],
            }}
          >
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>{tr("POS integration")}</div>
            {(() => {
              const conn = posConnection(posSystem, posConfig);
              if (conn === "connected") return <span style={badge("success")}>{tr("Connected")}</span>;
              if (conn === "incomplete") return <span style={badge("warn")}>{tr("Needs details")}</span>;
              return <span style={badge("neutral")}>{tr("Not set")}</span>;
            })()}
          </div>
          <p style={{ ...T.caption, color: C.muted, fontWeight: 500, margin: `0 0 ${S[3]}px` }}>
            {tr("Connect your point-of-sale so orders and payments stay in sync.")}
          </p>

          <label htmlFor="set-pos" style={labelStyle}>
            {tr("Your POS system")}
          </label>
          <select
            id="set-pos"
            value={posSystem}
            onChange={(e) => {
              setPosSystem(e.target.value);
              setPosConfig({}); // switching systems clears the old credentials
            }}
            style={field()}
          >
            {POS_SYSTEMS.map((p) => (
              <option key={p.id} value={p.id === "none" ? "" : p.id}>
                {p.id === "none" ? tr("None") : p.name}
              </option>
            ))}
          </select>

          {posFields(posSystem).length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: S[4], marginTop: S[4] }}>
              {posFields(posSystem).map((f) => (
                <div key={f.key}>
                  <label htmlFor={`pos-${f.key}`} style={labelStyle}>
                    {tr(f.label)}
                    {f.required ? "" : ` ${tr("(optional)")}`}
                  </label>
                  <input
                    id={`pos-${f.key}`}
                    type={f.secret ? "password" : "text"}
                    autoComplete={f.secret ? "new-password" : "off"}
                    placeholder={f.placeholder ? tr(f.placeholder) : undefined}
                    value={posConfig[f.key] ?? ""}
                    onChange={(e) => {
                      setPosConfig((c) => ({ ...c, [f.key]: e.target.value }));
                      setPosTest(null);
                    }}
                    style={field()}
                  />
                </div>
              ))}
            </div>
          )}

          {posSystem && posSystem !== "none" && (
            <button
              type="button"
              onClick={runTest}
              disabled={testing}
              className="qp-cta-lift"
              style={{ ...btn("secondary", { size: "sm", disabled: testing }), marginTop: S[3] }}
            >
              {testing && <Spinner size={14} />}
              {tr("Test connection")}
            </button>
          )}
          {posTest && (
            <div style={{ marginTop: S[3] }}>
              <Alert kind={posTest.ok ? "success" : posTest.automated ? "danger" : "info"}>
                {tr(posTest.message)}
              </Alert>
            </div>
          )}
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
