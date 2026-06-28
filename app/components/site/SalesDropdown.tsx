"use client";

import { useEffect, useRef, useState } from "react";
import { SITE } from "../../lib/site";
import { C, R, S, SHADOW, T, MONO, STATUS, card, btn } from "../../lib/theme";
import { useT } from "../../lib/i18n-client";

const PHONE = SITE.salesPhone;

// Inline "talk to sales" disclosure. No floating/absolute panel and no overlay:
// it renders as a normal in-flow card that the footer expands in place. Keeps
// the copy-to-clipboard behavior.
export function SalesDropdown() {
  const tr = useT();
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

  const failed = copyState === "fail";

  return (
    <div style={{ ...card({ pad: S[5], elevated: true }), textAlign: "start" }}>
      {/* Header: icon + title + hours */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: S[3],
          marginBottom: S[4],
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: R.md,
            background: C.brandTint,
            color: C.brand,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...T.h3, color: C.text }}>{tr("Call our sales team")}</div>
          <div style={{ ...T.caption, color: C.muted, fontWeight: 500 }}>
            {tr(SITE.salesHours)}
          </div>
        </div>
      </div>

      {/* The number — tappable, monospace ledger figures */}
      <a
        href={`tel:${PHONE}`}
        style={{
          display: "block",
          fontSize: 19,
          fontWeight: 700,
          color: C.brand,
          textDecoration: "none",
          padding: "12px 14px",
          background: C.surfaceAlt,
          border: `1px solid ${C.border}`,
          borderRadius: R.md,
          textAlign: "center",
          ...MONO,
        }}
      >
        {PHONE}
      </a>

      {/* Copy button — reflects ok / fail state */}
      <button
        className="qp-press"
        onClick={copy}
        aria-live="polite"
        style={{
          ...btn(failed ? "danger" : "secondary", { size: "sm", full: true }),
          marginTop: S[3],
          boxShadow: SHADOW.e1,
          color: copyState === "ok" ? STATUS.success.fg : undefined,
          borderColor: copyState === "ok" ? STATUS.success.border : undefined,
        }}
      >
        {copyState === "ok"
          ? tr("Copied")
          : copyState === "fail"
            ? tr("Copy failed, select above")
            : tr("Copy number")}
      </button>
    </div>
  );
}
