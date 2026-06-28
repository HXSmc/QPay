"use client";

// Shared UI primitives built on the design tokens (app/lib/theme.ts).
// These fill the states the audit found missing everywhere: empty, loading,
// error, and transient feedback. Inline-style approach preserved.

import { useEffect } from "react";
import { C, R, S, SHADOW, STATUS, T } from "../../lib/theme";

/** Composed empty state: icon + heading + description + optional action. */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: S[3],
        padding: `${S[7]}px ${S[5]}px`,
        border: `1px dashed ${C.borderStrong}`,
        borderRadius: R.lg,
        color: C.muted,
        background: C.surfaceAlt,
      }}
    >
      {icon && (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: R.md,
            background: C.brandTint,
            color: C.brand,
            display: "grid",
            placeItems: "center",
            boxShadow: SHADOW.e1,
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ ...T.h3, color: C.text }}>{title}</div>
      {body && <div style={{ ...T.body, maxWidth: 360, color: C.muted }}>{body}</div>}
      {action && <div style={{ marginTop: S[2] }}>{action}</div>}
    </div>
  );
}

/** Skeleton block - shape-matching loading placeholder (shimmer via globals). */
export function Skeleton({
  h = 16,
  w = "100%",
  radius = R.xs,
  style,
}: {
  h?: number | string;
  w?: number | string;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="qp-skeleton"
      style={{ height: h, width: w, borderRadius: radius, ...style }}
      aria-hidden
    />
  );
}

/** Inline spinner for busy buttons / loads. */
export function Spinner({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <span
      className="qp-spin"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: `2px solid ${color}`,
        borderTopColor: "transparent",
        borderRadius: "50%",
        verticalAlign: "-2px",
      }}
      role="status"
      aria-label="Loading"
    />
  );
}

/** Inline alert - error/success/warn/info, replaces bare red text + alert(). */
export function Alert({
  kind = "danger",
  children,
}: {
  kind?: keyof typeof STATUS;
  children: React.ReactNode;
}) {
  const s = STATUS[kind];
  return (
    <div
      role={kind === "danger" ? "alert" : "status"}
      style={{
        ...T.caption,
        fontWeight: 600,
        color: s.fg,
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: R.md,
        padding: `${S[2]}px ${S[3]}px`,
      }}
    >
      {children}
    </div>
  );
}

/** Auto-dismissing toast pinned bottom-center. Render when `message` is set. */
export function Toast({
  message,
  kind = "success",
  onDone,
  duration = 2600,
}: {
  message: string;
  kind?: keyof typeof STATUS;
  onDone: () => void;
  duration?: number;
}) {
  useEffect(() => {
    const id = setTimeout(onDone, duration);
    return () => clearTimeout(id);
  }, [message, duration, onDone]);
  const s = STATUS[kind];
  return (
    <div
      className="qp-toast"
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        left: "50%",
        bottom: S[5],
        transform: "translateX(-50%)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        gap: S[2],
        padding: `${S[3]}px ${S[4]}px`,
        borderRadius: R.md,
        background: C.ink,
        color: "#fff",
        fontSize: 14,
        fontWeight: 600,
        boxShadow: SHADOW.e3,
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: R.pill,
          background: s.border,
          flexShrink: 0,
        }}
      />
      {message}
    </div>
  );
}
