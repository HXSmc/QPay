"use client";

import { useState } from "react";
import { BRAND } from "../../lib/data";

export function DemoModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [restaurant, setRestaurant] = useState("");

  if (!open) return null;

  const close = () => {
    setSent(false);
    setName("");
    setEmail("");
    setRestaurant("");
    onClose();
  };

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
          <div style={{ textAlign: "center", padding: "12px 0" }}>
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
              Request received
            </h3>
            <p
              style={{
                fontSize: 14.5,
                color: "#475569",
                lineHeight: 1.55,
                margin: "0 0 22px",
              }}
            >
              Thanks{name ? `, ${name}` : ""} — our team will reach out shortly to
              schedule your QPay demo.
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 18,
              }}
            >
              <div>
                <h3 style={{ fontSize: 21, fontWeight: 800, margin: 0 }}>
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
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={field}
              />
              <input
                required
                type="email"
                placeholder="Work email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={field}
              />
              <input
                required
                placeholder="Restaurant name"
                value={restaurant}
                onChange={(e) => setRestaurant(e.target.value)}
                style={field}
              />
            </div>
            <button
              type="submit"
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
                cursor: "pointer",
                boxShadow: "0 10px 24px rgba(46,91,255,0.3)",
              }}
            >
              Request demo
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
