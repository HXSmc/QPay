"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { BRAND } from "../../lib/data";

const PHONE = "+966566201233";

export function SalesDropdown({
  onClose,
  anchorRef,
}: {
  onClose: () => void;
  // Outside-click boundary that INCLUDES the trigger button, so clicking the
  // trigger to close doesn't fire onClose (which would race with the trigger's
  // own toggle and leave the dropdown stuck open).
  anchorRef?: RefObject<HTMLElement>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const boundary = anchorRef?.current ?? ref.current;
      if (boundary && !boundary.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, anchorRef]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PHONE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        bottom: "calc(100% + 10px)",
        left: "50%",
        transform: "translateX(-50%)",
        width: 268,
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #E2E8F0",
        boxShadow: "0 20px 50px rgba(11,18,33,0.22)",
        padding: 18,
        zIndex: 60,
        textAlign: "left",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: "#EEF2FF",
            color: BRAND,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Call our sales team</div>
          <div style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>
            Sun–Thu · 9am–6pm
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
          color: BRAND,
          textDecoration: "none",
          padding: "10px 12px",
          background: "#F8FAFC",
          borderRadius: 11,
          textAlign: "center",
        }}
      >
        {PHONE}
      </a>

      <button
        onClick={copy}
        style={{
          width: "100%",
          marginTop: 10,
          padding: "9px 0",
          background: "#fff",
          color: "#0B1221",
          border: "1.5px solid #E2E8F0",
          borderRadius: 10,
          fontFamily: "inherit",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {copied ? "Copied ✓" : "Copy number"}
      </button>
    </div>
  );
}
