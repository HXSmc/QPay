"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { getAppBaseUrl } from "../../lib/url";
import { C, R, S, T, btn } from "../../lib/theme";
import { Modal } from "../ui/Primitives";

/**
 * QR viewer popup. Renders inside the shared <Modal> overlay primitive.
 * QR generation, customer URL build, download-SVG and print behaviors are
 * identical to before.
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    // The capability token gates the customer endpoints, so the QR must carry it.
    setUrl(
      `${getAppBaseUrl()}/customer?table=${tableNum}&t=${encodeURIComponent(token)}`,
    );
  }, [tableNum, token]);

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
    <Modal onClose={onClose} ariaLabel={`Table ${tableNum} QR code`} maxWidth={560}>
      <div style={{ padding: S[5] }}>
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
            onClick={onClose}
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
      </div>
    </Modal>
  );
}
