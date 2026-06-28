"use client";

import { useEffect, useRef, useState } from "react";
import { submitLead, type LeadResult } from "../../lib/api";
import { C, S, STATUS, T, btn, field } from "../../lib/theme";
import { Alert, Spinner } from "../ui/Primitives";
import { useT } from "../../lib/i18n-client";

// Basic format check (local-part@domain.tld). Catches obvious typos before we
// hit the network, without trying to be an RFC-complete validator.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Inline demo-request form (no popup, no overlay). It lives in the normal page
// flow inside an expandable section. `open` only drives focus + reset; the
// expand/collapse animation is owned by the parent section.
export function DemoForm({ open }: { open: boolean }) {
  const tr = useT();
  const [sent, setSent] = useState(false);
  const [result, setResult] = useState<LeadResult | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const firstInputRef = useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!EMAIL_RE.test(email.trim())) {
      setError(tr("Please enter a valid work email (name@company.com)."));
      return;
    }
    setBusy(true);
    try {
      const res = await submitLead({ name, email, restaurant });
      setResult(res);
      setSent(true);
    } catch {
      setError(tr("Couldn't send your request. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setSent(false);
    setResult(null);
    setName("");
    setEmail("");
    setRestaurant("");
    setError("");
    setBusy(false);
  };

  // Focus the first field when the section is opened (and not already sent).
  useEffect(() => {
    if (open && !sent) firstInputRef.current?.focus();
  }, [open, sent]);

  // Shared label styling: sits ABOVE every field (no placeholder-as-label).
  const labelStyle = { ...T.label, color: C.text, marginBottom: 6, display: "block" };

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
          {result?.status === "exists" ? tr("Check your inbox") : tr("Your trial is ready")}
        </h3>
        <p style={{ ...T.body, color: C.muted, margin: "0 0 16px", maxWidth: 460 }}>
          {result?.status === "exists" ? (
            <>
              {tr("Thanks")}{name ? `, ${name}` : ""}.{" "}
              {tr(
                "This email already has a Nuqra account, so we've sent you a note on how to reach our sales team to extend or upgrade."
              )}
            </>
          ) : (
            <>
              {tr("Thanks")}{name ? `, ${name}` : ""}.{" "}
              {tr("We've emailed your trial admin login to")}{" "}
              <strong>{email}</strong>.{" "}
              {tr("It's valid for 7 days. Check your inbox to sign in.")}
            </>
          )}
        </p>
        {result && !result.emailed && (
          <div style={{ marginBottom: 18, maxWidth: 460 }}>
            <Alert kind="warn">
              {tr(
                "Email delivery is still being set up. Contact sales if it doesn't arrive."
              )}
            </Alert>
          </div>
        )}
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: S[4],
        }}
        className="qp-grid-2"
      >
        <div>
          <label htmlFor="demo-name" style={labelStyle}>
            {tr("Your name")}
          </label>
          <input
            id="demo-name"
            required
            ref={firstInputRef}
            aria-label={tr("Your name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={field()}
          />
        </div>
        <div>
          <label htmlFor="demo-email" style={labelStyle}>
            {tr("Work email")}
          </label>
          <input
            id="demo-email"
            required
            type="email"
            aria-label={tr("Work email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={field()}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="demo-restaurant" style={labelStyle}>
            {tr("Restaurant name")}
          </label>
          <input
            id="demo-restaurant"
            required
            aria-label={tr("Restaurant name")}
            value={restaurant}
            onChange={(e) => setRestaurant(e.target.value)}
            style={field()}
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
        style={{
          ...btn("primary", { size: "lg", disabled: busy }),
          marginTop: S[4],
          gap: 9,
        }}
      >
        {busy ? (
          <>
            <Spinner size={16} color="#fff" /> {tr("Sending")}
          </>
        ) : (
          tr("Start free trial")
        )}
      </button>
      <p
        style={{
          ...T.caption,
          color: C.faint,
          marginTop: S[3],
          marginBottom: 0,
        }}
      >
        {tr("7-day trial admin login, no card required.")}
      </p>
    </form>
  );
}
