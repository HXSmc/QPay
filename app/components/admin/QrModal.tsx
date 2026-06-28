"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { getAppBaseUrl } from "../../lib/url";
import { C, R, S, T, btn, card } from "../../lib/theme";

const EASE = "cubic-bezier(0.16,1,0.3,1)";

/**
 * Inline QR panel (no longer a modal/overlay). Renders as a full-width row
 * inside the tables grid that expands in place below the selected table card.
 * QR generation, customer URL build, download-SVG and print behaviors are
 * identical to the previous popup.
 */
export function QrModal({
  tableNum,
  token,
  restaurantName = "Nuqra",
  onClose,
}: {
  tableNum: string;
  token: string;
  restaurantName?: string;
  onClose: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [url, setUrl] = useState("");

  // Collapse instantly when the user prefers reduced motion.
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  // Drives the expand/collapse transition. Mount collapsed, then expand.
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // The capability token gates the customer endpoints, so the QR must carry it.
    setUrl(
      `${getAppBaseUrl()}/customer?table=${tableNum}&t=${encodeURIComponent(token)}`,
    );
  }, [tableNum, token]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!shown) return;
    closeRef.current?.focus();
    rootRef.current?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "nearest",
    });
  }, [shown, reduced]);

  // Smoothly collapse, then notify the parent once the height transition ends.
  const requestClose = () => {
    if (reduced) {
      onClose();
      return;
    }
    setShown(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

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
    a.download = `nuqra-table-${tableNum}.svg`;
    a.click();
    URL.revokeObjectURL(href);
  };

  const print = () => {
    const s = svgString();
    if (!s) return;
    const w = window.open("", "_blank", "width=420,height=560");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Nuqra Table ${tableNum}</title>
      <style>body{font-family:system-ui,sans-serif;text-align:center;padding:40px}
      h1{font-size:20px;margin:0 0 4px}p{color:${C.muted};margin:0 0 24px}</style></head>
      <body><h1>${restaurantName}</h1><p>Scan to pay · Table ${tableNum}</p>${s}
      <script>window.onload=function(){window.print();}<\/script></body></html>`);
    w.document.close();
  };

  return (
    <div
      ref={rootRef}
      style={{
        gridColumn: "1 / -1",
        display: "grid",
        gridTemplateRows: shown ? "1fr" : "0fr",
        opacity: shown ? 1 : 0,
        transition: reduced
          ? "none"
          : `grid-template-rows 280ms ${EASE}, opacity 220ms ${EASE}`,
      }}
      onTransitionEnd={(e) => {
        if (e.propertyName === "grid-template-rows" && !shown) onClose();
      }}
    >
      <div style={{ overflow: "hidden", minHeight: 0 }}>
        <section
          aria-label={`Table ${tableNum} QR code`}
          style={{
            ...card({ pad: S[5], radius: R.lg, elevated: true }),
            borderLeft: `3px solid ${C.brand}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: S[4],
            }}
          >
            <h3 style={{ ...T.h3, fontSize: 18, margin: 0 }}>Table {tableNum} QR</h3>
            <button
              ref={closeRef}
              onClick={requestClose}
              aria-label="Close"
              className="qp-cta-lift"
              style={{
                border: `1.5px solid ${C.border}`,
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

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: S[5],
              alignItems: "flex-start",
            }}
          >
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
                  <QRCodeSVG value={url} size={196} level="M" fgColor={C.ink} />
                </span>
              )}
            </div>

            <div
              style={{
                flex: "1 1 240px",
                minWidth: 220,
                display: "flex",
                flexDirection: "column",
                gap: S[3],
              }}
            >
              <p style={{ ...T.caption, color: C.muted, margin: 0 }}>
                Diners scan to open the bill for this table.
              </p>
              <div
                style={{
                  ...T.caption,
                  color: C.muted,
                  wordBreak: "break-all",
                  padding: `${S[2]}px ${S[3]}px`,
                  background: C.surfaceAlt,
                  border: `1px solid ${C.border}`,
                  borderRadius: R.sm,
                }}
              >
                {url}
              </div>
              <div style={{ display: "flex", gap: S[2] + 2, flexWrap: "wrap" }}>
                <button
                  className="qp-cta-lift"
                  onClick={downloadSvg}
                  style={{ ...btn("primary"), flex: "1 1 140px" }}
                >
                  Download SVG
                </button>
                <button
                  className="qp-cta-lift"
                  onClick={print}
                  style={{ ...btn("secondary"), flex: "1 1 140px" }}
                >
                  Print
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
