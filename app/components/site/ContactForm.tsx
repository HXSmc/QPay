"use client";

import { useRef, useState } from "react";
import { submitLead } from "../../lib/api";
import { C, S, STATUS, T, btn, field } from "../../lib/theme";
import { Alert, Spinner } from "../ui/Primitives";
import { useT } from "../../lib/i18n-client";
import { POS_SYSTEMS } from "../../lib/pos";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sales-inquiry form (kind: "sales"). Unlike the demo form it provisions no
// trial; it captures a richer profile so the team can prepare and follow up at
// the prospect's preferred time. Lives in the normal page flow (no modal).
export function ContactForm() {
  const tr = useT();
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tables, setTables] = useState("");
  const [branches, setBranches] = useState("");
  const [posSystem, setPosSystem] = useState("");
  const [preferredDates, setPreferredDates] = useState("");
  const [message, setMessage] = useState("");
  const [hp, setHp] = useState(""); // honeypot — humans never fill this
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const firstInputRef = useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !restaurant.trim()) {
      setError(tr("Please add your name and restaurant."));
      return;
    }
    if (!phone.trim() && !email.trim()) {
      setError(tr("Add a phone number or email so we can reach you."));
      return;
    }
    if (email.trim() && !EMAIL_RE.test(email.trim())) {
      setError(tr("Invalid email — enter a valid address like name@company.com."));
      return;
    }
    setBusy(true);
    try {
      await submitLead({
        kind: "sales",
        name,
        restaurant,
        email,
        phone,
        tables: tables ? Number(tables) : undefined,
        branches: branches ? Number(branches) : undefined,
        posSystem: posSystem || undefined,
        preferredDates: preferredDates || undefined,
        message: message || undefined,
        hp,
      });
      setSent(true);
    } catch {
      setError(tr("Couldn't send your request. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setSent(false);
    setName("");
    setRestaurant("");
    setEmail("");
    setPhone("");
    setTables("");
    setBranches("");
    setPosSystem("");
    setPreferredDates("");
    setMessage("");
    setError("");
    setBusy(false);
  };

  const labelStyle = { ...T.label, color: C.text, marginBottom: 6, display: "block" } as const;

  if (sent) {
    return (
      <div aria-live="polite" aria-atomic="true">
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: "50%",
            background: STATUS.success.bg,
            color: STATUS.success.fg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-4-4" />
          </svg>
        </div>
        <h3 style={{ ...T.h1, color: C.text, margin: "0 0 8px" }}>
          {tr("Thanks, we'll be in touch")}
        </h3>
        <p style={{ ...T.body, color: C.muted, margin: "0 0 16px", maxWidth: 460 }}>
          {tr("Thanks")}
          {name ? `, ${name}` : ""}.{" "}
          {tr(
            "Our team will reach out at the time you picked to walk you through Nuqra and your POS integration."
          )}
        </p>
        <button
          className="qp-press"
          onClick={reset}
          style={{ ...btn("secondary", { size: "md" }) }}
        >
          {tr("Send another request")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      {/* Honeypot — see DemoForm. */}
      <input
        type="text"
        name="company_url"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: S[4] }}
        className="qp-grid-2"
      >
        <div>
          <label htmlFor="c-name" style={labelStyle}>
            {tr("Your name")}
          </label>
          <input
            id="c-name"
            required
            ref={firstInputRef}
            aria-label={tr("Your name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={field()}
          />
        </div>
        <div>
          <label htmlFor="c-restaurant" style={labelStyle}>
            {tr("Restaurant name")}
          </label>
          <input
            id="c-restaurant"
            required
            aria-label={tr("Restaurant name")}
            value={restaurant}
            onChange={(e) => setRestaurant(e.target.value)}
            style={field()}
          />
        </div>
        <div>
          <label htmlFor="c-phone" style={labelStyle}>
            {tr("Phone number")}
          </label>
          <input
            id="c-phone"
            type="tel"
            inputMode="tel"
            aria-label={tr("Phone number")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={field()}
          />
        </div>
        <div>
          <label htmlFor="c-email" style={labelStyle}>
            {tr("Email (optional)")}
          </label>
          <input
            id="c-email"
            type="email"
            aria-label={tr("Email (optional)")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={field()}
          />
        </div>
        <div>
          <label htmlFor="c-tables" style={labelStyle}>
            {tr("Number of tables")}
          </label>
          <input
            id="c-tables"
            type="number"
            min={0}
            inputMode="numeric"
            aria-label={tr("Number of tables")}
            value={tables}
            onChange={(e) => setTables(e.target.value)}
            style={field()}
          />
        </div>
        <div>
          <label htmlFor="c-branches" style={labelStyle}>
            {tr("Number of branches")}
          </label>
          <input
            id="c-branches"
            type="number"
            min={0}
            inputMode="numeric"
            aria-label={tr("Number of branches")}
            value={branches}
            onChange={(e) => setBranches(e.target.value)}
            style={field()}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="c-pos" style={labelStyle}>
            {tr("Which POS do you use?")}
          </label>
          <select
            id="c-pos"
            aria-label={tr("Which POS do you use?")}
            value={posSystem}
            onChange={(e) => setPosSystem(e.target.value)}
            style={field()}
          >
            <option value="">{tr("Select your POS (optional)")}</option>
            {POS_SYSTEMS.filter((p) => p.id !== "none").map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="c-dates" style={labelStyle}>
            {tr("Best dates and times to reach you")}
          </label>
          <input
            id="c-dates"
            aria-label={tr("Best dates and times to reach you")}
            placeholder={tr("e.g. Sunday or Monday mornings")}
            value={preferredDates}
            onChange={(e) => setPreferredDates(e.target.value)}
            style={field()}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="c-message" style={labelStyle}>
            {tr("Anything you'd like us to know?")}
          </label>
          <textarea
            id="c-message"
            aria-label={tr("Anything you'd like us to know?")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            style={{ ...field(), resize: "vertical", minHeight: 96 }}
          />
        </div>
      </div>
      {error && (
        <div style={{ marginTop: S[3] }}>
          <Alert kind="danger">{error}</Alert>
        </div>
      )}
      <button
        type="submit"
        disabled={busy}
        className="qp-cta"
        style={{ ...btn("primary", { size: "lg", disabled: busy }), marginTop: S[4], gap: 9 }}
      >
        {busy ? (
          <>
            <Spinner size={16} color="#fff" /> {tr("Sending")}
          </>
        ) : (
          tr("Request a callback")
        )}
      </button>
      <p style={{ ...T.caption, color: C.muted, marginTop: S[3], marginBottom: 0 }}>
        {tr("We only use these details to set up your walkthrough. No spam.")}
      </p>
    </form>
  );
}
