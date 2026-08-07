"use client";

// A product-story visual for the landing: THREE restaurant-table cards
// (Available / Ordered / Paid) spread wide in a Cover Flow-style composition,
// center card front-facing and full size, the other two spread out to either
// side, rotated inward and pushed back in depth (perspective + translateZ,
// never blur filters). Auto-advances so each card takes the front every
// ~2.8s, pauses on hover/focus, and is interactive: click/tap anywhere to
// toggle pause/resume, use arrow keys, or drag/swipe to rotate it.
//
// Geometry: `pos` is a monotonic front-position accumulator (never wrapped),
// and each card's world angle is `(i - pos) * FACE_ANGLE + dragOffset`,
// normalized to a signed "slot" value in [-1, 1] (0 = dead center). That slot
// linearly drives translateX (spread), translateZ (depth), rotateY (inward
// tilt), scale, and opacity for every card, every frame, so drag and
// auto-rotate both animate continuously and always settle on a slot exactly
// front-and-center. Spread/depth/tilt distances are clamp()'d against the
// viewport inside the transform strings, so the composition scales down and
// the side cards read as edge peeks on narrow screens with no JS resize
// listener.
//
// Stays inside the existing light design language (theme.ts C tokens, white
// surface cards, R/S/SHADOW conventions) with no dark styling, glows, or new
// fonts. Arabic strings live in this file (the i18n dictionaries are out of
// scope); useLocale() selects them per current language.

import { useEffect, useRef, useState } from "react";
import { C, R, S, SHADOW, MONO, STATUS, badge } from "../lib/theme";
import { useLocale } from "../lib/i18n-client";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

const FACE_ANGLE = 120; // three cards evenly spaced around the logical ring
const HEIGHT = 372;
const STEP_MS = 2800;
const TRANS_MS = 660;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const MAX_W_STATIC = 900; // cap for the reduced-motion static fallback only
const CARD_W = 280; // desktop cap; clamp()'d down on narrow viewports
const PERSPECTIVE = 1500;
// Cover Flow geometry caps (desktop values; each is clamp()'d against the
// viewport in the transform string so side cards spread less, and peek at
// the edges instead of overflowing, on narrow screens).
const SPREAD_X = 380; // how far side cards translate from center
const DEPTH_Z = 260; // how far side cards push back in depth
const TILT_Y = 42; // degrees side cards rotate inward toward center
const SIDE_SCALE = 0.86;
const SIDE_OPACITY = 0.55;
const DRAG_DEG_PER_PX = 0.45; // rotation sensitivity while dragging
const TAP_PX = 8; // below this movement a pointer up/down counts as a click
const STAGE_PAD_Y = S[4]; // breathing room above/below the stage, both branches

// Check mark used on the Paid face (same stroke language as the rest of the page).
const CHECK = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-4-4" />
  </svg>
);

type StateKey = "available" | "ordered" | "paid";
type BadgeKind = "info" | "warn" | "success";

// Each state lives at its own table so the three cards read as three real
// tables in the room, not one table cycling through faces.
const STATES: {
  key: StateKey;
  en: string;
  ar: string;
  badge: BadgeKind;
  tableEn: string;
  tableAr: string;
}[] = [
  { key: "available", en: "Available", ar: "متاحة", badge: "info", tableEn: "Table 12", tableAr: "الطاولة 12" },
  { key: "ordered", en: "Ordered", ar: "تم الطلب", badge: "warn", tableEn: "Table 7", tableAr: "الطاولة 7" },
  { key: "paid", en: "Paid", ar: "مدفوعة", badge: "success", tableEn: "Table 3", tableAr: "الطاولة 3" },
];

// State-tinted accent (top border) per card, drawn from the existing STATUS
// tokens plus the brand cyan for "available": quiet, single-hue-per-card,
// no new colors.
const ACCENT: Record<BadgeKind, string> = {
  info: C.brand,
  warn: STATUS.warn.fg,
  success: STATUS.success.fg,
};

// Ordered line items. Amounts are SAR and arithmetically consistent (they sum to
// the Paid total), echoing the magnitudes of the live-bill preview.
const ITEMS_EN: Array<[string, string]> = [
  ["2× Truffle Burger", "SAR 36.00"],
  ["Caesar Salad", "SAR 12.50"],
  ["Tiramisu", "SAR 9.50"],
];
const ITEMS_AR: Array<[string, string]> = [
  ["2× برجر الكمأة", "SAR 36.00"],
  ["سلطة سيزر", "SAR 12.50"],
  ["تيراميسو", "SAR 9.50"],
];
const TOTAL = "SAR 58.00";

export function TableCycle() {
  const locale = useLocale();
  const rtl = locale === "ar";
  const reduced = usePrefersReducedMotion();

  // `pos` is a monotonic front-position integer (never wrapped modulo 3);
  // the front card is ((pos % 3) + 3) % 3. Keeping it monotonic is what makes
  // the Cover Flow slots settle seamlessly. `dragOffset` is a live degree
  // offset added while dragging; it is folded into the same slot math so the
  // spread tracks the pointer exactly, even mid-drag.
  const [pos, setPos] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(false);
  // Click-toggled pause, distinct from the transient hover/focus/drag pause
  // above so leaving the pointer doesn't silently resume a user-paused ring.
  const [manualPause, setManualPause] = useState(false);

  // Reduced-motion highlight: which static card the user clicked.
  const [highlight, setHighlight] = useState<number | null>(0);

  const frontIndex = ((pos % STATES.length) + STATES.length) % STATES.length;
  // Under RTL we keep the same slot math and only flip the gesture/keyboard
  // directions (see handlers), so the drag feel and spin stay consistent.

  // Drag bookkeeping (refs, no re-render needed while tracking).
  const startXRef = useRef(0);
  const movedRef = useRef(false);
  const activePointerRef = useRef<number | null>(null);

  // Auto-advance. Stops under reduced-motion (static row rendered instead),
  // while hovered/focused, and mid-drag.
  useEffect(() => {
    if (reduced || paused || manualPause || dragging) return;
    const id = window.setInterval(() => {
      setPos((p) => p + 1);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [reduced, paused, manualPause, dragging]);

  const label = (s: (typeof STATES)[number]) => (rtl ? s.ar : s.en);
  const tableFor = (s: (typeof STATES)[number]) => (rtl ? s.tableAr : s.tableEn);
  const current = STATES[frontIndex];

  // Badge with slightly stronger contrast than the shared theme default (a
  // touch heavier border + weight) so state reads at a glance on the card.
  const cardBadge = (kind: BadgeKind) => ({
    ...badge(kind),
    fontWeight: 800,
    borderWidth: 1.5,
  });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    startXRef.current = e.clientX;
    movedRef.current = false;
    activePointerRef.current = e.pointerId;
    setDragging(true);
    setPaused(true);
    // Some browsers (notably certain WebKit builds) can throw a NotFoundError
    // here on edge-case pointer ids; swallow it rather than aborting the
    // drag start and leaving the ring stuck.
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== e.pointerId) return;
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > TAP_PX) movedRef.current = true;
    // Under RTL a rightward drag should feel like it pulls the ring the same
    // visual way, so the horizontal axis is mirrored.
    const signed = rtl ? -dx : dx;
    setDragOffset(signed * DRAG_DEG_PER_PX);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== e.pointerId) return;
    activePointerRef.current = null;
    // Mirrors the try/catch on setPointerCapture above: a NotFoundError here
    // must not abort endDrag, or the ring freezes mid-drag permanently.
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
    if (movedRef.current) {
      // It was a drag: snap to the nearest card implied by the total
      // rotation, then drop the live offset so the ring settles cleanly.
      const nearest = Math.round((pos * FACE_ANGLE - dragOffset) / FACE_ANGLE);
      setPos(nearest);
    } else {
      // It was a click/tap: toggle auto-rotation pause.
      setManualPause((p) => !p);
    }
    setDragOffset(0);
    setDragging(false);
    setPaused(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (reduced) return;
    // ArrowRight = next in LTR, prev in RTL (natural reading direction).
    const next = rtl ? e.key === "ArrowLeft" : e.key === "ArrowRight";
    const prev = rtl ? e.key === "ArrowRight" : e.key === "ArrowLeft";
    if (next) {
      e.preventDefault();
      setPos((p) => p + 1);
    } else if (prev) {
      e.preventDefault();
      setPos((p) => p - 1);
    }
  };

  const faceBody = (i: number) => {
    const s = STATES[i];
    if (s.key === "available") {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            gap: 6,
            padding: "10px 0",
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: R.md,
              background: C.brandTint,
              color: C.brand,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 6,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 8h16" />
              <path d="M4 8v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
              <path d="M9 4v4" />
              <path d="M15 4v4" />
            </svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
            {label(s)}
          </div>
          <div style={{ fontSize: 13.5, color: C.muted }}>
            {rtl ? "4 مقاعد متاحة" : "4 seats free"}
          </div>
        </div>
      );
    }
    if (s.key === "ordered") {
      const items = rtl ? ITEMS_AR : ITEMS_EN;
      return (
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ flex: 1 }}>
            {items.map(([name, price]) => (
              <div
                key={name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 10,
                  fontSize: 13,
                  color: C.muted,
                  padding: "6px 0",
                }}
              >
                <span>{name}</span>
                <span style={{ fontWeight: 600, color: C.text, ...MONO }}>
                  {price}
                </span>
              </div>
            ))}
          </div>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: STATUS.warn.fg,
              marginTop: 8,
            }}
          >
            {rtl ? "بانتظار الدفع" : "Awaiting payment"}
          </div>
        </div>
      );
    }
    // paid
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          gap: 10,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: R.pill,
            ...cardBadge("success"),
            fontSize: 12.5,
          }}
        >
          {CHECK}
          {label(s)}
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: C.text, ...MONO }}>
          {TOTAL}
        </div>
        <div style={{ fontSize: 13, color: C.muted }}>
          {rtl ? "دفع بالبطاقة" : "Paid by card"}
        </div>
      </div>
    );
  };

  // The visual card. `i` is the card identity; the caller wrapper positions
  // it (translateX/translateZ/rotateY per its Cover Flow slot) - this just
  // renders the flat card face at its native orientation.
  const card = (i: number) => {
    const s = STATES[i];
    const isFront = i === frontIndex;
    return (
      <div
        style={{
          width: `clamp(200px, 62vw, ${CARD_W}px)`,
          height: HEIGHT,
          background: C.surface,
          borderInline: `1px solid ${isFront ? C.borderStrong : C.border}`,
          borderBottom: `1px solid ${isFront ? C.borderStrong : C.border}`,
          borderTop: `3px solid ${ACCENT[s.badge]}`,
          borderRadius: R.lg,
          boxShadow: isFront ? SHADOW.e2 : SHADOW.e1,
          padding: S[5],
          display: "flex",
          flexDirection: "column",
          cursor: "inherit",
          transition: `box-shadow ${TRANS_MS}ms ${EASE}, border-color ${TRANS_MS}ms ${EASE}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 600, color: C.muted }}>
            {tableFor(s)}
          </span>
          <span style={{ ...cardBadge(s.badge), fontSize: 11 }}>{label(s)}</span>
        </div>
        {faceBody(i)}
      </div>
    );
  };

  // Reduced-motion: a static, informative row of the three states. No
  // rotation, but each card is clickable to highlight it.
  if (reduced) {
    return (
      <div
        style={{
          display: "flex",
          gap: S[4],
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: MAX_W_STATIC,
          margin: "0 auto",
          padding: `${STAGE_PAD_Y}px 0`,
        }}
      >
        {STATES.map((s, i) => {
          const active = highlight === i;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setHighlight(i)}
              aria-pressed={active}
              style={{
                flex: "1 1 150px",
                minWidth: 150,
                maxWidth: 200,
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                textAlign: "initial",
                fontFamily: "inherit",
              }}
            >
              <div
                style={{
                  background: C.surface,
                  borderInline: `1px solid ${active ? C.brand : C.border}`,
                  borderBottom: `1px solid ${active ? C.brand : C.border}`,
                  borderTop: `3px solid ${ACCENT[s.badge]}`,
                  borderRadius: R.lg,
                  boxShadow: active ? SHADOW.e2 : SHADOW.e1,
                  padding: S[4],
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  height: "100%",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span
                    style={{ fontSize: 11.5, fontWeight: 600, color: C.muted }}
                  >
                    {tableFor(s)}
                  </span>
                  <span style={{ ...cardBadge(s.badge), fontSize: 10.5 }}>
                    {label(s)}
                  </span>
                </div>
                <div style={{ fontSize: 13.5, color: C.muted }}>
                  {s.key === "available" &&
                    (rtl ? "4 مقاعد متاحة" : "4 seats free")}
                  {s.key === "ordered" &&
                    (rtl ? "بانتظار الدفع" : "Awaiting payment")}
                  {s.key === "paid" && (
                    <span style={{ fontWeight: 700, color: C.text, ...MONO }}>
                      {TOTAL}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
                  {label(s)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  const cardTransition = dragging
    ? "none"
    : `transform ${TRANS_MS}ms ${EASE}, opacity ${TRANS_MS}ms ${EASE}`;

  return (
    <div
      tabIndex={0}
      role="group"
      aria-pressed={manualPause}
      aria-label={
        rtl
          ? "حالة الطاولة: متاحة، تم الطلب، مدفوعة. انقر للإيقاف المؤقت أو الاستئناف، اسحب أو استخدم الأسهم للتدوير."
          : "Table state: Available, Ordered, Paid. Click to pause or resume, drag or use arrow keys to rotate."
      }
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{
        width: "100%",
        height: HEIGHT + STAGE_PAD_Y * 2,
        padding: `${STAGE_PAD_Y}px 0`,
        outline: "none",
        cursor: dragging ? "grabbing" : "grab",
        touchAction: "pan-y",
        userSelect: "none",
        opacity: manualPause ? 0.88 : 1,
        transition: `opacity ${TRANS_MS}ms ${EASE}`,
        // Side cards intentionally spread past the stage's own bounds on
        // narrow screens (that's the "peeking at the edges" look); clip here
        // so that never leaks into page-level horizontal scroll.
        overflow: "hidden",
      }}
    >
      {/* Screen-reader live region: announce the current state as it advances. */}
      <span
        aria-live="polite"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          margin: -1,
          padding: 0,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {tableFor(current)} {label(current)}
      </span>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: HEIGHT,
          perspective: PERSPECTIVE,
        }}
      >
        {/* The Cover Flow stage. Every card's world angle is a continuous
            function of the monotonic `pos` accumulator plus the live drag
            offset, so both auto-advance and drag animate smoothly and always
            settle with a card dead-center. */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: HEIGHT,
            transformStyle: "preserve-3d",
          }}
        >
          {STATES.map((_, i) => {
            const worldAngle = (i - pos) * FACE_ANGLE + dragOffset;
            // Normalize into a signed slot in (-1.5, 1.5], 0 = dead center.
            const slot =
              (((worldAngle + 180) % 360 + 360) % 360 - 180) / FACE_ANGLE;
            const depth = Math.min(Math.abs(slot), 1);
            // Fixed-decimal strings (never JS scientific notation) going
            // straight into a CSS transform string.
            const slotStr = slot.toFixed(4);
            const zStr = (-depth * DEPTH_Z).toFixed(2);
            const rotStr = (-slot * TILT_Y).toFixed(3);
            const scaleStr = (1 - depth * (1 - SIDE_SCALE)).toFixed(4);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transformStyle: "preserve-3d",
                  transform: `translateX(calc(${slotStr} * clamp(90px, 30vw, ${SPREAD_X}px))) translateZ(${zStr}px) rotateY(${rotStr}deg) scale(${scaleStr})`,
                  opacity: 1 - depth * (1 - SIDE_OPACITY),
                  transition: cardTransition,
                }}
              >
                {card(i)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
