"use client";

// Honest, non-annoying exit-intent trial popup (B2B SaaS pattern).
// Desktop: fires once when the cursor leaves toward the tab bar. Touch/mobile:
// a one-time ~45s fallback (exit-intent is unavailable on touch). Frequency-
// capped via localStorage so it never nags (14 days after any show/dismiss).
// Renders through the shared accessible Modal (focus, Escape, scroll-lock).

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { C, R, S, T, btn } from "../../lib/theme";
import { Modal } from "../ui/Primitives";
import { LogoMark } from "./Logo";

const CAP_KEY = "nuqra_demo_popup_v1";
const CAP_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const FALLBACK_MS = 45000;

function recentlyHandled(): boolean {
  try {
    const v = localStorage.getItem(CAP_KEY);
    if (!v) return false;
    const t = Number(v);
    return Number.isFinite(t) && Date.now() - t < CAP_MS;
  } catch {
    return false;
  }
}

function mark() {
  try {
    localStorage.setItem(CAP_KEY, String(Date.now()));
  } catch {
    /* private mode / disabled storage - ignore */
  }
}

export function DemoPopup() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const firedRef = useRef(false);

  useEffect(() => {
    if (recentlyHandled()) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const onMouseOut = (e: MouseEvent) => {
      // Cursor crossed the top edge toward the browser chrome.
      if (e.clientY <= 0 && !e.relatedTarget) trigger();
    };
    const cleanup = () => {
      document.removeEventListener("mouseout", onMouseOut);
      if (timer) clearTimeout(timer);
    };
    const trigger = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      mark();
      setOpen(true);
      cleanup();
    };

    document.addEventListener("mouseout", onMouseOut);
    timer = setTimeout(trigger, FALLBACK_MS);
    return cleanup;
  }, []);

  const dismiss = () => {
    mark();
    setOpen(false);
  };
  const go = () => {
    mark();
    setOpen(false);
    router.push("/demo");
  };

  if (!open) return null;

  return (
    <Modal onClose={dismiss} ariaLabel="Start your free trial" maxWidth={440}>
      <div style={{ padding: S[6], textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: S[4] }}>
          <LogoMark size={40} />
        </div>
        <div
          style={{
            ...T.label,
            color: C.brand,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}
        >
          Free trial
        </div>
        <h2
          style={{
            fontSize: 25,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
            color: C.text,
            margin: "10px 0 0",
          }}
        >
          Take your first QR payment today
        </h2>
        <p
          style={{
            fontSize: 15.5,
            color: C.muted,
            lineHeight: 1.55,
            margin: "12px auto 0",
            maxWidth: 340,
          }}
        >
          Start a free 7-day trial. No card, live in minutes.
        </p>
        <div style={{ marginTop: S[5], display: "grid", gap: S[3] }}>
          <button
            type="button"
            className="qp-cta"
            onClick={go}
            style={{ ...btn("primary", { size: "lg", full: true }) }}
          >
            Start free trial
          </button>
          <button
            type="button"
            className="qp-press"
            onClick={dismiss}
            style={{
              background: "transparent",
              border: "none",
              color: C.muted,
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              padding: S[2],
              borderRadius: R.sm,
            }}
          >
            No thanks
          </button>
        </div>
      </div>
    </Modal>
  );
}
