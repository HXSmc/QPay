// Next.js instrumentation hook — runs once per server/edge instance at startup.
// We route to the runtime-appropriate Sentry init config, and export
// onRequestError so Next.js forwards unhandled route-handler/middleware errors
// to Sentry (the App Router equivalent of a global error capture). The configs
// no-op when no DSN env var is set, so this is harmless without GlitchTip.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  } else if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Forward Next.js request-time errors (route handlers, server actions,
// middleware) to Sentry. No-op until a DSN is configured.
export const onRequestError = Sentry.captureRequestError;
