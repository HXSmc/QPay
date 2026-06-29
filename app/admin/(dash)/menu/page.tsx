"use client";

import { useEffect, useRef, useState } from "react";
import { deleteMenu, getMenu, uploadMenu } from "../../../lib/api";
import type { MenuMeta } from "../../../lib/types";
import { C, R, S, T, SHADOW, btn } from "../../../lib/theme";
import { Alert, EmptyState, Spinner } from "../../../components/ui/Primitives";
import { MenuItemsEditor } from "../../../components/admin/MenuItemsEditor";
import { useT } from "../../../lib/i18n-client";

type Tab = "file" | "items";

export default function MenuPage() {
  const tr = useT();
  const [tab, setTab] = useState<Tab>("file");

  return (
    <div className="qp-page" style={{ padding: "30px 36px", maxWidth: 820 }}>
      <h1 style={{ ...T.h1, margin: 0 }}>{tr("Menu")}</h1>
      <p style={{ ...T.body, color: C.muted, margin: "6px 0 20px" }}>
        {tr("Upload a menu file diners can view, and optionally add orderable items so they can order from their phone.")}
      </p>

      <div
        role="tablist"
        aria-label={tr("Menu type")}
        style={{ display: "inline-flex", gap: 4, background: C.canvas, padding: 4, borderRadius: R.md, marginBottom: S[5] }}
      >
        <TabButton active={tab === "file"} onClick={() => setTab("file")}>
          {tr("Menu file")}
        </TabButton>
        <TabButton active={tab === "items"} onClick={() => setTab("items")}>
          {tr("Order items")}
        </TabButton>
      </div>

      {tab === "file" ? <FileTab /> : <MenuItemsEditor />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        padding: "9px 18px",
        borderRadius: R.sm,
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 14,
        fontWeight: 700,
        background: active ? C.surface : "transparent",
        color: active ? C.brand : C.muted,
        boxShadow: active ? SHADOW.e1 : "none",
        transition: "background .15s, color .15s",
      }}
    >
      {children}
    </button>
  );
}

function FileTab() {
  const tr = useT();
  const [meta, setMeta] = useState<MenuMeta | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getMenu().then(setMeta).catch(() => {});
  }, []);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setProgress(0);
    setError("");
    try {
      setMeta(await uploadMenu(file, (pct) => setProgress(pct)));
    } catch {
      setError(tr("Upload failed. Use an image or PDF (max 20MB)."));
    } finally {
      setBusy(false);
      setProgress(null);
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
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: R.lg, padding: S[5] }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={onFile}
        style={{ display: "none" }}
      />
      <div style={{ display: "flex", gap: 10, marginBottom: meta ? S[5] : 0 }}>
        <button
          className="qp-cta qp-press"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          style={btn("primary", { disabled: busy })}
        >
          {busy ? (
            <>
              <Spinner color="#fff" />
              {progress !== null ? ` ${tr("Uploading")} ${progress}%` : ` ${tr("Preparing.")}`}
            </>
          ) : meta ? (
            tr("Replace menu")
          ) : (
            tr("Upload menu")
          )}
        </button>
        {meta && (
          <button onClick={remove} disabled={busy} style={btn("danger")}>
            {tr("Remove")}
          </button>
        )}
      </div>

      {error && (
        <div style={{ marginTop: S[3] }}>
          <Alert kind="danger">{error}</Alert>
        </div>
      )}

      {!meta ? (
        <div style={{ marginTop: S[5] }}>
          <EmptyState
            title={tr("No menu uploaded")}
            body={tr("PNG, JPG, WebP, GIF, or PDF. Diners can view it before they pay.")}
          />
        </div>
      ) : (
        <div style={{ marginTop: src ? 0 : S[5] }}>
          <div style={{ ...T.caption, color: C.muted, marginBottom: 10 }}>
            {meta.originalName} · {tr("uploaded")} {new Date(meta.uploadedAt).toLocaleString()}
          </div>
          <div
            style={{
              borderRadius: R.md,
              overflow: "hidden",
              border: `1px solid ${C.border}`,
              background: C.surfaceAlt,
            }}
          >
            {isPdf ? (
              <iframe src={src!} title={tr("Menu PDF")} style={{ width: "100%", height: "60vh", border: "none" }} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src!} alt={tr("Uploaded menu")} style={{ width: "100%", display: "block" }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
