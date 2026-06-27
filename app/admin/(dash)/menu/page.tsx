"use client";

import { useEffect, useRef, useState } from "react";
import { BRAND } from "../../../lib/data";
import { deleteMenu, getMenu, uploadMenu } from "../../../lib/api";
import type { MenuMeta } from "../../../lib/types";

export default function MenuPage() {
  const [meta, setMeta] = useState<MenuMeta | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getMenu().then(setMeta).catch(() => {});
  }, []);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const m = await uploadMenu(file);
      setMeta(m);
    } catch {
      setError("Upload failed. Use an image or PDF.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteMenu();
      setMeta(null);
    } finally {
      setBusy(false);
    }
  };

  const src = meta?.url ?? null;
  const isPdf = meta?.mime === "application/pdf";

  return (
    <div className="qp-page" style={{ padding: "30px 36px", maxWidth: 760 }}>
      <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
        Menu
      </h1>
      <p style={{ fontSize: 14, color: "#64748B", margin: "5px 0 24px", fontWeight: 600 }}>
        Upload your menu (image or PDF). Diners can view it before paying.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={onFile}
        style={{ display: "none" }}
      />

      <div
        style={{
          background: "#fff",
          border: "1px solid #E2E8F0",
          borderRadius: 18,
          padding: 24,
        }}
      >
        <div style={{ display: "flex", gap: 10, marginBottom: meta ? 20 : 0 }}>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            style={{
              padding: "11px 18px",
              background: BRAND,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 700,
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? "Uploading…" : meta ? "Replace menu" : "Upload menu"}
          </button>
          {meta && (
            <button
              onClick={remove}
              disabled={busy}
              style={{
                padding: "11px 18px",
                background: "#fff",
                color: "#DC2626",
                border: "1.5px solid #FECACA",
                borderRadius: 12,
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 700,
                cursor: busy ? "default" : "pointer",
              }}
            >
              Remove
            </button>
          )}
        </div>

        {error && (
          <div style={{ fontSize: 13, fontWeight: 600, color: "#DC2626", marginTop: 12 }}>
            {error}
          </div>
        )}

        {!meta ? (
          <div
            style={{
              marginTop: 20,
              padding: "48px 20px",
              border: "2px dashed #CBD5E1",
              borderRadius: 14,
              textAlign: "center",
              color: "#64748B",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: "#475569" }}>
              No menu uploaded
            </div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              PNG, JPG, WebP, GIF, or PDF.
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: "#64748B", marginBottom: 10, fontWeight: 600 }}>
              {meta.originalName} · uploaded{" "}
              {new Date(meta.uploadedAt).toLocaleString()}
            </div>
            <div
              style={{
                borderRadius: 14,
                overflow: "hidden",
                border: "1px solid #E2E8F0",
                background: "#F8FAFC",
              }}
            >
              {isPdf ? (
                <iframe
                  src={src!}
                  title="Menu PDF"
                  style={{ width: "100%", height: "60vh", border: "none" }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src!} alt="Menu" style={{ width: "100%", display: "block" }} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
