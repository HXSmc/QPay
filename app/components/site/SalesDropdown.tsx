"use client";

import { useEffect, useRef, useState } from "react";
import { SITE } from "../../lib/site";
import { C, R, S, SHADOW, T, NUM, STATUS } from "../../lib/theme";

const PHONE = SITE.salesPhone;

// Inline "talk to sales" disclosure. No floating/absolute panel and no overlay:
// it renders as a normal in-flow card that the footer expands in place. Keeps
// the copy-to-clipboard behavior.
export function SalesDropdown() {
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "ok" | "fail">("idle");

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error("no clipboard");
      await navigator.clipboard.writeText(PHONE);
      setCopyState("ok");
    } catch {
      // Surface the failure instead of swallowing it (insecure context / denied
      // permission). The number is shown above for manual copy.
      setCopyState("fail");
    }
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyState("idle"), 2000);
  };

  return (
    <div
      style={{
        background: C.surface,
        borderRadius: R.lg,
        border: `1px solid ${C.border}`,
        boxShadow: SHADOW.e2,
        padding: S[4],
        textAlign: "left",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: S[3],
          marginBottom: S[3],
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: R.sm,
            background: C.brandTint,
            color: C.brand,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </div>
        <div>
          <div style={{ ...T.h3, color: C.text }}>Call our sales team</div>
          <div style={{ ...T.caption, color: C.muted, fontWeight: 500 }}>
            {SITE.salesHours}
          </div>
        </div>
      </div>

      <a
        href={`tel:${PHONE}`}
        style={{
          display: "block",
          fontSize: 19,
          fontWeight: 800,
          letterSpacing: "-0.01em",
          color: C.brand,
          textDecoration: "none",
          padding: "10px 12px",
          background: C.surfaceAlt,
          borderRadius: R.sm,
          textAlign: "center",
          ...NUM,
        }}
      >
        {PHONE}
      </a>

      <button
        className="qp-press"
        onClick={copy}
        aria-live="polite"
        style={{
          width: "100%",
          marginTop: S[3],
          padding: "9px 0",
          background: C.surface,
          color: copyState === "fail" ? STATUS.danger.fg : C.text,
          border: `1.5px solid ${copyState === "fail" ? STATUS.danger.border : C.border}`,
          borderRadius: R.sm,
          fontFamily: "inherit",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {copyState === "ok"
          ? "Copied ✓"
          : copyState === "fail"
            ? "Copy failed, select above"
            : "Copy number"}
      </button>
    </div>
  );
}
