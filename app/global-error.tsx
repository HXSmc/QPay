"use client";

// App Router global error boundary. This component REPLACES the root layout on
// a render crash, so it renders its own <html>/<body> and can't rely on layout
// fonts/classes. It captures the error to Sentry (no-op without a DSN) and
// shows a calm, honest message + a way back. theme.ts is pure data (no JSX, no
// CSS dependency), so it is safe to import here to stay on the paper-ledger
// tokens. No diner-facing payment flow runs here.
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { C } from "./lib/theme";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: C.canvas,
          color: C.text,
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 15, color: C.muted, margin: "0 0 20px" }}>
            We hit an unexpected error. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "11px 20px",
              background: C.brand,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
