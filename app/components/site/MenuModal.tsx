"use client";

// Inline menu viewer (progressive disclosure). The menu (image or PDF) expands
// IN PLACE inside the customer card flow, directly below the action buttons.
// No overlay, no backdrop, no role="dialog". Smooth height + opacity reveal that
// collapses instantly under prefers-reduced-motion. Keeps the getMenu fetch, the
// PDF / image rendering, and the "no menu" fallback. A fullscreen overlay (with
// image zoom + drag-to-pan) is layered on top additively via the shared Modal.

import { useEffect, useRef, useState } from "react";
import { getMenu } from "../../lib/api";
import { C, R, btn } from "../../lib/theme";
import { useT } from "../../lib/i18n-client";
import type { MenuMeta } from "../../lib/types";
import { Modal } from "../ui/Primitives";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.5;

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
  const tr = useT();
  const [meta, setMeta] = useState<MenuMeta | null>(null);
  const [loading, setLoading] = useState(true);
  // Stays true after the first open so the panel content survives the collapse
  // transition (and re-opening is instant) without re-fetching on every render.
  const [loaded, setLoaded] = useState(false);
  // Fullscreen overlay state (additive). Image-only zoom + pan offset.
  const [fs, setFs] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  // Tracks the last pointer position + active drag for drag-to-pan.
  const dragRef = useRef<{ active: boolean; x: number; y: number }>({
    active: false,
    x: 0,
    y: 0,
  });
  const reduced = usePrefersReducedMotion();

  // If the menu panel closes while fullscreen is up, exit fullscreen and reset
  // zoom/pan so no orphan overlay survives.
  useEffect(() => {
    if (!open) {
      setFs(false);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [open]);

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
  // bring the panel into view when it opens. Guarded so it is a no-op while the
  // fullscreen overlay is up — there, Modal's own Escape (onClose=setFs(false))
  // exits fullscreen first instead of collapsing the whole menu.
  useEffect(() => {
    if (!open || fs) return;
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
  }, [open, onClose, reduced, fs]);

  const src = meta?.url ?? null;
  const isPdf = meta?.mime === "application/pdf";
  const canFullscreen = !!src && loaded && !loading;

  // Zoom helpers — clamp to [ZOOM_MIN, ZOOM_MAX]; reset pan when back to 1x.
  const applyZoom = (next: number) => {
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
    setZoom(clamped);
    if (clamped <= ZOOM_MIN) setPan({ x: 0, y: 0 });
  };
  const zoomIn = () => applyZoom(zoom + ZOOM_STEP);
  const zoomOut = () => applyZoom(zoom - ZOOM_STEP);
  const zoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    dragRef.current = { active: true, x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    dragRef.current.x = e.clientX;
    dragRef.current.y = e.clientY;
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current.active = false;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };
  const onWheel = (e: React.WheelEvent) => {
    applyZoom(zoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  };

  const zoomBtn: React.CSSProperties = {
    ...btn("secondary", { size: "sm" }),
    width: 38,
    height: 34,
    padding: 0,
    fontSize: 16,
    lineHeight: 1,
  };

  return (
    <>
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
                {tr("Menu")}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {canFullscreen && (
                  <button
                    type="button"
                    className="qp-cta-lift"
                    onClick={() => setFs(true)}
                    aria-label={tr("View menu fullscreen")}
                    style={{ ...btn("secondary", { size: "sm" }), gap: 6 }}
                  >
                    <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>
                      ⤢
                    </span>
                    {tr("Fullscreen")}
                  </button>
                )}
                <button
                  ref={closeBtnRef}
                  onClick={onClose}
                  aria-label={tr("Hide menu")}
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
                  {tr("Loading.")}
                </span>
              ) : !src ? (
                <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.muted }}>
                    {tr("No menu uploaded yet")}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>
                    {tr("The restaurant hasn't added a menu.")}
                  </div>
                </div>
              ) : isPdf ? (
                <iframe
                  src={src}
                  title={tr("Menu PDF")}
                  style={{ width: "100%", height: "62vh", border: "none" }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={tr("Menu")}
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

      {fs && src && (
        <Modal
          fullScreen
          ariaLabel={tr("Menu")}
          onClose={() => setFs(false)}
          panelStyle={{
            display: "flex",
            flexDirection: "column",
            background: C.canvas,
          }}
        >
          {/* Top bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "12px 16px",
              borderBottom: `1px solid ${C.border}`,
              background: C.surface,
              flexShrink: 0,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: C.text }}>
              {tr("Menu")}
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {!isPdf && (
                <div
                  role="group"
                  aria-label={tr("Zoom")}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <button
                    type="button"
                    className="qp-press"
                    onClick={zoomOut}
                    aria-label={tr("Zoom out")}
                    disabled={zoom <= ZOOM_MIN}
                    style={zoomBtn}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className="qp-press"
                    onClick={zoomReset}
                    aria-label={tr("Reset zoom")}
                    style={{
                      ...btn("secondary", { size: "sm" }),
                      minWidth: 56,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    type="button"
                    className="qp-press"
                    onClick={zoomIn}
                    aria-label={tr("Zoom in")}
                    disabled={zoom >= ZOOM_MAX}
                    style={zoomBtn}
                  >
                    +
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setFs(false)}
                aria-label={tr("Exit fullscreen")}
                style={{
                  border: "none",
                  background: C.canvas,
                  borderRadius: R.xs,
                  width: 34,
                  height: 34,
                  cursor: "pointer",
                  color: C.muted,
                  fontSize: 20,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Content area fills the rest */}
          {isPdf ? (
            <iframe
              src={src}
              title={tr("Menu PDF")}
              style={{ width: "100%", height: "100%", border: "none", flex: 1 }}
            />
          ) : (
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              onWheel={onWheel}
              style={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: C.surfaceAlt,
                cursor: zoom > 1 ? "grab" : "default",
                touchAction: zoom > 1 ? "none" : "auto",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={tr("Menu")}
                draggable={false}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  display: "block",
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: dragRef.current.active
                    ? "none"
                    : reduced
                      ? "none"
                      : `transform 120ms ${EASE}`,
                  userSelect: "none",
                }}
              />
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
