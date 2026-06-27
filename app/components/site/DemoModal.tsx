"use client";

import { useEffect, useRef, useState } from "react";
import { BRAND } from "../../lib/data";
import { submitLead, type LeadResult } from "../../lib/api";

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
        padding: 16,
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
          background: "#fff",
          borderRadius: 22,
          padding: 28,
          boxShadow: "0 30px 70px rgba(11,18,33,0.4)",
        }}
      >
        {sent ? (
          <div
            style={{ textAlign: "center", padding: "12px 0" }}
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
              >
                <path d="M20 6 9 17l-4-4" />
              </svg>
            </div>
            <h3 style={{ fontSize: 21, fontWeight: 800, margin: "0 0 8px" }}>
              {result?.status === "exists" ? "Check your inbox" : "Your demo is ready"}
            </h3>
            <p
              style={{
                fontSize: 14.5,
                color: "#475569",
                lineHeight: 1.55,
                margin: "0 0 22px",
              }}
            >
              {result?.status === "exists" ? (
                <>
                  Thanks{name ? `, ${name}` : ""} — this email already has a QPay
                  account, so we&apos;ve sent you a note on how to reach our sales
                  team to extend or upgrade.
                </>
              ) : (
                <>
                  Thanks{name ? `, ${name}` : ""} — we&apos;ve emailed your trial
                  admin login to <strong>{email}</strong>. It&apos;s valid for 7
                  days. Check your inbox to sign in.
                </>
              )}
              {result && !result.emailed && (
                <>
                  {" "}
                  <span style={{ color: "#B45309", fontWeight: 600 }}>
                    (Email delivery is still being set up — contact sales if it
                    doesn&apos;t arrive.)
                  </span>
                </>
              )}
            </p>
            <button
              onClick={close}
              style={{
                padding: "12px 24px",
                background: BRAND,
                color: "#fff",
                border: "none",
                borderRadius: 12,
                fontFamily: "inherit",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 18,
              }}
            >
              <div>
                <h3 id="demo-title" style={{ fontSize: 21, fontWeight: 800, margin: 0 }}>
                  Get a free demo
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: "#475569",
                    margin: "6px 0 0",
                    lineHeight: 1.5,
                  }}
                >
                  See QPay live at your restaurant in 20 minutes.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                style={{
                  border: "none",
                  background: "#F1F5F9",
                  borderRadius: 9,
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  color: "#475569",
                  fontSize: 18,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <input
                required
                ref={firstInputRef}
                aria-label="Your name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={field}
              />
              <input
                required
                type="email"
                aria-label="Work email"
                placeholder="Work email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={field}
              />
              <input
                required
                aria-label="Restaurant name"
                placeholder="Restaurant name"
                value={restaurant}
                onChange={(e) => setRestaurant(e.target.value)}
                style={field}
              />
            </div>
            {error && (
              <div
                role="alert"
                style={{
                  marginTop: 12,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#DC2626",
                }}
              >
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              style={{
                width: "100%",
                marginTop: 18,
                padding: 14,
                background: BRAND,
                color: "#fff",
                border: "none",
                borderRadius: 12,
                fontFamily: "inherit",
                fontSize: 15.5,
                fontWeight: 700,
                cursor: busy ? "default" : "pointer",
                opacity: busy ? 0.7 : 1,
                boxShadow: "0 10px 24px rgba(46,91,255,0.3)",
              }}
            >
              {busy ? "Sending…" : "Request demo"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
