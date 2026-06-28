"use client";

// Inline menu viewer (progressive disclosure). The menu (image or PDF) expands
// IN PLACE inside the customer card flow, directly below the action buttons.
// No overlay, no backdrop, no role="dialog". Smooth height + opacity reveal that
// collapses instantly under prefers-reduced-motion. Keeps the getMenu fetch, the
// PDF / image rendering, and the "no menu" fallback.

import { useEffect, useRef, useState } from "react";
import { getMenu } from "../../lib/api";
import { C, R } from "../../lib/theme";
import type { MenuMeta } from "../../lib/types";

const EASE = "cubic-bezier(0.16,1,0.3,1)";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function MenuModal({
  open,
  tableNum,
  token,
  onClose,
}: {
  open: boolean;
  tableNum?: string;
  token?: string;
  onClose: () => void;
}) {
  const [meta, setMeta] = useState<MenuMeta | null>(null);
  const [loading, setLoading] = useState(true);
  // Stays true after the first open so the panel content survives the collapse
  // transition (and re-opening is instant) without re-fetching on every render.
  const [loaded, setLoaded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const reduced = usePrefersReducedMotion();

  // Fetch only when the panel opens (behavior preserved from the modal).
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setLoaded(true);
    getMenu(tableNum, token)
      .then(setMeta)
      .catch(() => setMeta(null))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escape still closes the inline panel; focus the close control and gently
  // bring the panel into view when it opens.
  useEffect(() => {
    if (!open) return;
    closeBtnRef.current?.focus();
    panelRef.current?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "nearest",
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, reduced]);

  const src = meta?.url ?? null;
  const isPdf = meta?.mime === "application/pdf";

  return (
    <div
      aria-hidden={!open}
      inert={!open}
      style={{
        display: "grid",
        gridTemplateRows: open ? "1fr" : "0fr",
        opacity: open ? 1 : 0,
        transition: reduced
          ? "none"
          : `grid-template-rows 300ms ${EASE}, opacity 220ms ${EASE}`,
      }}
    >
      <div style={{ overflow: "hidden", minHeight: 0 }}>
        <div
          ref={panelRef}
          style={{
            marginTop: 14,
            border: `1px solid ${C.border}`,
            borderRadius: R.lg,
            overflow: "hidden",
            background: C.surface,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "13px 16px",
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: C.text }}>
              Menu
            </h3>
            <button
              ref={closeBtnRef}
              onClick={onClose}
              aria-label="Hide menu"
              style={{
                border: "none",
                background: C.canvas,
                borderRadius: R.xs,
                width: 30,
                height: 30,
                cursor: "pointer",
                color: C.muted,
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              background: C.surfaceAlt,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 200,
            }}
          >
            {!loaded || loading ? (
              <span style={{ color: C.muted, fontSize: 14, fontWeight: 600, padding: 40 }}>
                Loading.
              </span>
            ) : !src ? (
              <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.muted }}>
                  No menu uploaded yet
                </div>
                <div style={{ fontSize: 13, marginTop: 6 }}>
                  The restaurant hasn&apos;t added a menu.
                </div>
              </div>
            ) : isPdf ? (
              <iframe
                src={src}
                title="Menu PDF"
                style={{ width: "100%", height: "62vh", border: "none" }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt="Menu"
                style={{
                  width: "100%",
                  height: "auto",
                  maxHeight: "62vh",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
