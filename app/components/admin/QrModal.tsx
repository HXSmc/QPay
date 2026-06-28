"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { getAppBaseUrl } from "../../lib/url";
import { C, R, S, T, btn } from "../../lib/theme";

export function QrModal({
  tableNum,
  token,
  restaurantName = "QPay",
  onClose,
}: {
  tableNum: string;
  token: string;
  restaurantName?: string;
  onClose: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    // The capability token gates the customer endpoints, so the QR must carry it.
    setUrl(
      `${getAppBaseUrl()}/customer?table=${tableNum}&t=${encodeURIComponent(token)}`,
    );
  }, [tableNum, token]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const svgString = () => {
    const svg = wrapRef.current?.querySelector("svg");
    if (!svg) return "";
    return new XMLSerializer().serializeToString(svg);
  };

  const downloadSvg = () => {
    const s = svgString();
    if (!s) return;
    const blob = new Blob([s], { type: "image/svg+xml;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `qpay-table-${tableNum}.svg`;
    a.click();
    URL.revokeObjectURL(href);
  };

  const print = () => {
    const s = svgString();
    if (!s) return;
    const w = window.open("", "_blank", "width=420,height=560");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>QPay Table ${tableNum}</title>
      <style>body{font-family:system-ui,sans-serif;text-align:center;padding:40px}
      h1{font-size:20px;margin:0 0 4px}p{color:#475569;margin:0 0 24px}</style></head>
      <body><h1>${restaurantName}</h1><p>Scan to pay · Table ${tableNum}</p>${s}
      <script>window.onload=function(){window.print();}<\/script></body></html>`);
    w.document.close();
  };

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
        padding: S[4],
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-title"
        style={{
          width: "100%",
          maxWidth: 360,
          background: C.surface,
          borderRadius: R.xl,
          padding: S[6] - 4,
          textAlign: "center",
          boxShadow: "0 30px 70px rgba(11,18,33,0.4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: S[1] }}>
          <h3 id="qr-title" style={{ ...T.h3, fontSize: 18, margin: 0 }}>Table {tableNum} QR</h3>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none",
              background: C.canvas,
              borderRadius: R.xs,
              width: 32,
              height: 32,
              cursor: "pointer",
              color: C.muted,
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <p style={{ ...T.caption, color: C.muted, margin: `0 0 ${S[4] + 2}px` }}>
          Diners scan to open the bill for this table.
        </p>

        <div
          ref={wrapRef}
          style={{
            display: "flex",
            justifyContent: "center",
            padding: S[4] + 2,
            background: C.surfaceAlt,
            borderRadius: R.lg,
            border: `1px solid ${C.border}`,
          }}
        >
          {url && (
            <span role="img" aria-label={`Payment QR code for table ${tableNum}`}>
              <QRCodeSVG value={url} size={196} level="M" fgColor="#0B1221" />
            </span>
          )}
        </div>

        <div
          style={{
            ...T.caption,
            color: C.muted,
            margin: `${S[3]}px 0 ${S[4] + 2}px`,
            wordBreak: "break-all",
          }}
        >
          {url}
        </div>

        <div style={{ display: "flex", gap: S[2] + 2 }}>
          <button
            className="qp-cta-lift"
            onClick={downloadSvg}
            style={{ ...btn("primary"), flex: 1 }}
          >
            Download SVG
          </button>
          <button
            className="qp-cta-lift"
            onClick={print}
            style={{ ...btn("secondary"), flex: 1 }}
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
