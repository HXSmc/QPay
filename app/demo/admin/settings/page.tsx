"use client";

// /demo/admin/settings: role-dependent demo settings. Branch admin sees POS
// integration + a Branch ID field. Group admin sees a ZATCA ID field, POS
// integration, and a restaurant-profile block. All editable client state only
// (no fetch / no persistence). Same paper-ledger language as sibling subpages.

import { useState, type ReactNode } from "react";
import { S, T, SHADOW, card, field, btn, badge } from "../../../lib/theme";
import { RESTAURANT } from "../../_data";
import { PageHead, useAdminDemo, tr, LABEL_STYLE, type UIKey } from "../_shared";

const POS_PROVIDERS = ["Foodics", "Square", "Lightspeed", "Toast"] as const;

export default function SettingsPage() {
  const { locale, role } = useAdminDemo();
  const t = (k: UIKey) => tr(locale, k);
  const isBranch = role === "branch";

  return (
    <>
      <PageHead
        title={t("navSettings")}
        sub={isBranch ? t("settingsSubBranch") : t("settingsSubGroup")}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: S[5], maxWidth: 680 }}>
        {isBranch ? <BranchSettings locale={locale} /> : <GroupSettings locale={locale} />}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Branch admin variant
// ---------------------------------------------------------------------------

function BranchSettings({ locale }: { locale: "ar" | "en" }) {
  const t = (k: UIKey) => tr(locale, k);
  const [provider, setProvider] = useState<string>(RESTAURANT.posIntegration);
  const [connected, setConnected] = useState(true);
  const [branchId, setBranchId] = useState("br_dhahran");
  const [saved, setSaved] = useState(false);

  return (
    <>
      <SettingsCard title={t("secIntegration")}>
        <Field label={t("posProvider")} htmlFor="qp-pos-provider">
          <select
            id="qp-pos-provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            style={{ ...field(), padding: "11px 13px" }}
          >
            {POS_PROVIDERS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </Field>
        <div style={{ display: "flex", alignItems: "center", gap: S[2], flexWrap: "wrap" }}>
          <span style={badge(connected ? "success" : "neutral")}>
            {connected ? t("posConnected") : t("posDisconnected")}
          </span>
          <button
            type="button"
            className="qp-press"
            onClick={() => setConnected((v) => !v)}
            style={btn(connected ? "secondary" : "primary", { size: "sm" })}
          >
            {connected ? t("disconnect") : t("connect")}
          </button>
        </div>
      </SettingsCard>

      <SettingsCard title={t("branchIdField")}>
        <Field label={t("branchIdField")} htmlFor="qp-branch-id">
          <input
            id="qp-branch-id"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            style={{ ...field(), fontFamily: "var(--font-mono), ui-monospace, monospace" }}
          />
        </Field>
      </SettingsCard>

      <SaveBar saved={saved} onSave={() => { setSaved(true); window.setTimeout(() => setSaved(false), 2500); }} labels={{ save: t("save"), saved: t("saved") }} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Group admin variant
// ---------------------------------------------------------------------------

function GroupSettings({ locale }: { locale: "ar" | "en" }) {
  const t = (k: UIKey) => tr(locale, k);
  const [zatca, setZatca] = useState("310447592500003");
  const [provider, setProvider] = useState<string>(RESTAURANT.posIntegration);
  const [connected, setConnected] = useState(true);
  const [legalName, setLegalName] = useState(RESTAURANT.legalName);
  const [vat, setVat] = useState("300447592500003");
  const [currency, setCurrency] = useState("SAR");
  const [saved, setSaved] = useState(false);

  return (
    <>
      <SettingsCard title={t("zatcaIdField")}>
        <Field label={t("zatcaIdField")} htmlFor="qp-zatca">
          <input
            id="qp-zatca"
            value={zatca}
            onChange={(e) => setZatca(e.target.value)}
            style={{ ...field(), fontFamily: "var(--font-mono), ui-monospace, monospace" }}
          />
        </Field>
      </SettingsCard>

      <SettingsCard title={t("secIntegration")}>
        <Field label={t("posProvider")} htmlFor="qp-pos-provider-g">
          <select
            id="qp-pos-provider-g"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            style={{ ...field(), padding: "11px 13px" }}
          >
            {POS_PROVIDERS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </Field>
        <div style={{ display: "flex", alignItems: "center", gap: S[2], flexWrap: "wrap" }}>
          <span style={badge(connected ? "success" : "neutral")}>
            {connected ? t("posConnected") : t("posDisconnected")}
          </span>
          <button
            type="button"
            className="qp-press"
            onClick={() => setConnected((v) => !v)}
            style={btn(connected ? "secondary" : "primary", { size: "sm" })}
          >
            {connected ? t("disconnect") : t("connect")}
          </button>
        </div>
      </SettingsCard>

      <SettingsCard title={t("secProfile")}>
        <Field label={t("legalNameField")} htmlFor="qp-legal">
          <input id="qp-legal" value={legalName} onChange={(e) => setLegalName(e.target.value)} style={field()} />
        </Field>
        <Field label={t("vatNumberField")} htmlFor="qp-vat">
          <input
            id="qp-vat"
            value={vat}
            onChange={(e) => setVat(e.target.value)}
            style={{ ...field(), fontFamily: "var(--font-mono), ui-monospace, monospace" }}
          />
        </Field>
        <Field label={t("defaultCurrencyField")} htmlFor="qp-currency">
          <select
            id="qp-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{ ...field(), padding: "11px 13px" }}
          >
            {["SAR", "AED", "USD"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
      </SettingsCard>

      <SaveBar saved={saved} onSave={() => { setSaved(true); window.setTimeout(() => setSaved(false), 2500); }} labels={{ save: t("save"), saved: t("saved") }} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function SettingsCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ ...card({ pad: S[5], radius: 14 }), display: "flex", flexDirection: "column", gap: S[4] }}>
      <h2 style={{ ...T.h3, margin: 0 }}>{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label style={LABEL_STYLE} htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

function SaveBar({
  saved,
  onSave,
  labels,
}: {
  saved: boolean;
  onSave: () => void;
  labels: { save: string; saved: string };
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: S[3], flexWrap: "wrap" }}>
      <button type="button" className="qp-press" onClick={onSave} style={btn("primary")}>
        {labels.save}
      </button>
      {saved ? (
        <span
          role="status"
          style={{
            ...badge("success"),
            boxShadow: SHADOW.e1,
          }}
        >
          {labels.saved}
        </span>
      ) : null}
    </div>
  );
}
