"use client";

import { useEffect, useRef, useState } from "react";
import { submitLead, type LeadResult } from "../../lib/api";
import { C, S, STATUS, T, btn, field } from "../../lib/theme";
import { Alert, Spinner } from "../ui/Primitives";
import { useT } from "../../lib/i18n-client";
import { POS_SYSTEMS } from "../../lib/pos";
import { SITE } from "../../lib/site";

// Basic format check (local-part@domain.tld). Catches obvious typos before we
// hit the network, without trying to be an RFC-complete validator.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Trial ceilings, from the single source in SITE (store.ts enforces the SAME
// numbers). Shown so a prospect who asks for more isn't silently capped.
const { maxTables: TRIAL_TABLES, maxBranches: TRIAL_BRANCHES } = SITE.trial;

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
  const [tables, setTables] = useState("");
  const [branches, setBranches] = useState("");
  const [posSystem, setPosSystem] = useState("");
  const [hp, setHp] = useState(""); // honeypot — humans never fill this
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const firstInputRef = useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // noValidate disables the native `required` checks, so validate in JS to
    // match ContactForm (otherwise a blank name/restaurant lead can be sent).
    if (!name.trim() || !restaurant.trim()) {
      setError(tr("Please add your name and restaurant."));
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError(tr("Please enter a valid work email (name@company.com)."));
      return;
    }
    setBusy(true);
    try {
      const res = await submitLead({
        name,
        email,
        restaurant,
        tables: tables ? Number(tables) : undefined,
        branches: branches ? Number(branches) : undefined,
        posSystem: posSystem || undefined,
        hp,
      });
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
    setTables("");
    setBranches("");
    setPosSystem("");
    setError("");
    setBusy(false);
  };

  // Focus the first field when the section is opened (and not already sent).
  useEffect(() => {
    if (open && !sent) firstInputRef.current?.focus();
  }, [open, sent]);

  // Shared label styling: sits ABOVE every field (no placeholder-as-label).
  const labelStyle = { ...T.label, color: C.text, marginBottom: 6, display: "block" };

  // A prospect can type any size, but a trial is capped. Detect when what they
  // asked for exceeds the trial so we can tell them up front (rather than let
  // them discover the silent cap after signing in) and route them to sales.
  const wantsMoreTables = tables !== "" && Number(tables) > TRIAL_TABLES;
  const wantsMoreBranches = branches !== "" && Number(branches) > TRIAL_BRANCHES;
  const overTrial = wantsMoreTables || wantsMoreBranches;

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
          {result?.status === "exists"
            ? tr("Check your inbox")
            : result?.emailed
              ? tr("Your trial is ready")
              : tr("Your trial is created")}
        </h3>
        <p style={{ ...T.body, color: C.muted, margin: "0 0 16px", maxWidth: 460 }}>
          {result?.status === "exists" ? (
            <>
              {tr("Thanks")}{name ? `, ${name}` : ""}.{" "}
              {tr(
                "This email already has a Nuqra account, so we've sent you a note on how to reach our sales team to extend or upgrade."
              )}
            </>
          ) : result?.emailed ? (
            <>
              {tr("Thanks")}{name ? `, ${name}` : ""}.{" "}
              {tr("We've emailed your trial admin login to")}{" "}
              <strong>{email}</strong>.{" "}
              {tr("It's valid for 7 days. Check your inbox to sign in.")}
            </>
          ) : (
            // Honest fallback: don't claim we emailed a login when delivery failed.
            <>
              {tr("Thanks")}{name ? `, ${name}` : ""}.{" "}
              {tr(
                "Your trial account is created, but we couldn't email your login just yet. Contact our sales team and we'll get you signed in."
              )}
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
      {/* Honeypot: off-screen, hidden from a11y + tab order. Bots fill it; humans
          can't see it. A filled value is dropped server-side. */}
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
        <div>
          <label htmlFor="demo-tables" style={labelStyle}>
            {tr("Number of tables")}
          </label>
          <input
            id="demo-tables"
            inputMode="numeric"
            min={0}
            type="number"
            aria-label={tr("Number of tables")}
            value={tables}
            onChange={(e) => setTables(e.target.value)}
            style={field()}
          />
        </div>
        <div>
          <label htmlFor="demo-branches" style={labelStyle}>
            {tr("Number of branches")}
          </label>
          <input
            id="demo-branches"
            inputMode="numeric"
            min={0}
            type="number"
            aria-label={tr("Number of branches")}
            value={branches}
            onChange={(e) => setBranches(e.target.value)}
            style={field()}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="demo-pos" style={labelStyle}>
            {tr("Which POS do you use?")}
          </label>
          <select
            id="demo-pos"
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
        {/* Always-visible trial scope so the tables/branches inputs above can't
            imply "type any number and you get it". */}
        <p
          style={{
            gridColumn: "1 / -1",
            ...T.caption,
            color: C.muted,
            margin: 0,
          }}
        >
          {tr(
            `Your free trial includes ${TRIAL_BRANCHES} branch and up to ${TRIAL_TABLES} tables. Need more? Our sales team can scale you up.`,
          )}
        </p>
      </div>
      {/* Honest heads-up: they asked for more than a trial provides. We still
          create the trial, but we say the cap out loud and route them to sales
          instead of letting them find the silent limit after signing in. */}
      {overTrial && (
        <div style={{ marginTop: S[3] }}>
          <Alert kind="info">
            {tr(
              `Heads up: trials are limited to ${TRIAL_BRANCHES} branch and ${TRIAL_TABLES} tables. We'll set up your trial with these limits now, and our sales team will reach out about a plan that fits your full size.`,
            )}
          </Alert>
        </div>
      )}
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
          color: C.muted,
          marginTop: S[3],
          marginBottom: 0,
        }}
      >
        {tr("7-day trial admin login, no card required.")}
      </p>
    </form>
  );
}
