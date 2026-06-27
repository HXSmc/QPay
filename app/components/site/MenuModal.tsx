"use client";

import { useEffect, useRef, useState } from "react";
import { getMenu } from "../../lib/api";
import type { MenuMeta } from "../../lib/types";

export function MenuModal({
  open,
  tableNum,
  onClose,
}: {
  open: boolean;
  tableNum?: string;
  onClose: () => void;
}) {
  const [meta, setMeta] = useState<MenuMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getMenu(tableNum)
      .then(setMeta)
      .catch(() => setMeta(null))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const src = meta?.url ?? null;
  const isPdf = meta?.mime === "application/pdf";

  return (
    <div
      onClick={onClose}
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-modal-title"
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "88vh",
          background: "#fff",
          borderRadius: 22,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 30px 70px rgba(11,18,33,0.4)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 20px",
            borderBottom: "1px solid #E2E8F0",
          }}
        >
          <h3 id="menu-modal-title" style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Menu</h3>
          <button
            ref={closeBtnRef}
            onClick={onClose}
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

        <div
          style={{
            flex: 1,
            overflow: "auto",
            background: "#F8FAFC",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 240,
          }}
        >
          {loading ? (
            <span style={{ color: "#64748B", fontSize: 14, fontWeight: 600 }}>
              Loading…
            </span>
          ) : !src ? (
            <div style={{ textAlign: "center", padding: 40, color: "#64748B" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#475569" }}>
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
              style={{ width: "100%", height: "70vh", border: "none" }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt="Menu"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
