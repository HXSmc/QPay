"use client";

import { useEffect, useRef, useState } from "react";
import { submitLead, type LeadResult } from "../../lib/api";
import { C, R, S, SHADOW, T, btn, field } from "../../lib/theme";
import { Alert, Spinner } from "../ui/Primitives";

// Basic format check (local-part@domain.tld). Catches obvious typos before we
// hit the network, without trying to be an RFC-complete validator.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function DemoModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [sent, setSent] = useState(false);
  const [result, setResult] = useState<LeadResult | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const firstInputRef = useRef<HTMLInputElement>(null);
  // The modal never unmounts (it early-returns null when closed), so guard the
  // async submit: if it was closed mid-request, don't paint stale success/error.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const close = () => {
    setSent(false);
    setResult(null);
    setName("");
    setEmail("");
    setRestaurant("");
    setError("");
    setBusy(false);
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!EMAIL_RE.test(email.trim())) {
      setError("Please enter a valid work email (name@company.com).");
      return;
    }
    setBusy(true);
    try {
      const res = await submitLead({ name, email, restaurant });
      if (openRef.current) {
        setResult(res);
        setSent(true);
      }
    } catch {
      if (openRef.current)
        setError("Couldn't send your request. Please try again.");
    } finally {
      if (openRef.current) setBusy(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && !sent) firstInputRef.current?.focus();
  }, [open, sent]);

  if (!open) return null;

  return (
    <div
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(11,18,33,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: S[4],
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 420,
          background: C.surface,
          borderRadius: R.xl,
          padding: S[6],
          boxShadow: SHADOW.e3,
        }}
      >
        {sent ? (
          <div
            style={{ textAlign: "center" }}
            aria-live="polite"
            aria-atomic="true"
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: "50%",
                background: "#DCFCE7",
                color: "#16A34A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
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
            <h3 style={{ ...T.h1, margin: "0 0 8px" }}>
              {result?.status === "exists" ? "Check your inbox" : "Your demo is ready"}
            </h3>
            <p
              style={{
                ...T.body,
                color: C.muted,
                margin: "0 0 16px",
              }}
            >
              {result?.status === "exists" ? (
                <>
                  Thanks{name ? `, ${name}` : ""}. This email already has a QPay
                  account, so we&apos;ve sent you a note on how to reach our sales
                  team to extend or upgrade.
                </>
              ) : (
                <>
                  Thanks{name ? `, ${name}` : ""}. We&apos;ve emailed your trial
                  admin login to <strong>{email}</strong>. It&apos;s valid for 7
                  days. Check your inbox to sign in.
                </>
              )}
            </p>
            {result && !result.emailed && (
              <div style={{ marginBottom: 18, textAlign: "left" }}>
                <Alert kind="warn">
                  Email delivery is still being set up. Contact sales if it
                  doesn&apos;t arrive.
                </Alert>
              </div>
            )}
            <button
              className="qp-press"
              onClick={close}
              style={{ ...btn("primary", { size: "md" }) }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 18,
              }}
            >
              <div>
                <h3 id="demo-title" style={{ ...T.h1, margin: 0 }}>
                  Get a free demo
                </h3>
                <p
                  style={{
                    ...T.body,
                    color: C.muted,
                    margin: "6px 0 0",
                  }}
                >
                  See QPay live at your restaurant in 20 minutes.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="qp-press"
                style={{
                  border: "none",
                  background: C.surfaceAlt,
                  borderRadius: R.sm,
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  color: C.muted,
                  fontSize: 18,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: S[3] }}>
              <input
                required
                ref={firstInputRef}
                aria-label="Your name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={field()}
              />
              <input
                required
                type="email"
                aria-label="Work email"
                placeholder="Work email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={field()}
              />
              <input
                required
                aria-label="Restaurant name"
                placeholder="Restaurant name"
                value={restaurant}
                onChange={(e) => setRestaurant(e.target.value)}
                style={field()}
              />
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
                ...btn("primary", { size: "lg", full: true, disabled: busy }),
                marginTop: 18,
              }}
            >
              {busy ? (
                <>
                  <Spinner size={16} color="#fff" /> Sending
                </>
              ) : (
                "Request demo"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
