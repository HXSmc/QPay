// Shared Sentry init primitives used by sentry.server.config.ts,
// sentry.edge.config.ts, and instrumentation-client.ts.
//
// PDPL (Saudi data law) basis: payments are mocked, but PII (diner emails,
// order bodies, auth cookies) still flows through request handlers. We never
// want any of that leaving the app, so every SDK init applies the same scrub:
//   • sendDefaultPii is left OFF (the SDK default — never enabled here).
//   • beforeSend drops request bodies, cookies, and auth/cookie headers, then
//     walks the whole event redacting email-shaped strings and console
//     breadcrumbs.
// All DSN values come from env (see per-runtime config files); with no DSN set
// the SDK never inits, so the app builds and runs exactly as today.

import type { Event } from "@sentry/nextjs";

// PDPL cap on performance data. 0.1 = 10% of transactions sampled at most.
export const TRACES_SAMPLE_RATE = 0.1;

// Headers that may carry credentials or session material — never forwarded.
const SENSITIVE_HEADERS = new Set([
  "cookie",
  "set-cookie",
  "authorization",
  "proxy-authorization",
  "x-api-key",
  "x-auth-token",
]);

// RFC-5322-ish local email matcher — redacted wherever it appears in the event.
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Recursively replace email-shaped strings in any value Sentry serialized.
function scrubValue<T>(value: T): T {
  if (typeof value === "string") return value.replace(EMAIL_RE, "[redacted]") as unknown as T;
  if (Array.isArray(value)) return value.map(scrubValue) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      out[key] = scrubValue((value as Record<string, unknown>)[key]);
    }
    return out as unknown as T;
  }
  return value;
}

/**
 * beforeSend applied in every runtime init config. Generic over the event
 * subtype so it satisfies BOTH the server (Event) and client (ErrorEvent)
 * beforeSend signatures — the return type tracks the input, so a narrower
 * ErrorEvent flows through unchanged.
 */
export function beforeSend<E extends Event>(event: E): E | null {
  // Drop console.* breadcrumbs (they may log request/user details).
  if (Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.filter((b) => b?.category !== "console");
  }

  // Request payload: strip body data, cookies, and sensitive headers.
  if (event.request) {
    delete event.request.data; // POST/PUT body
    delete event.request.cookies;
    if (event.request.headers) {
      const sanitized: Record<string, string> = {};
      for (const [key, val] of Object.entries(event.request.headers)) {
        if (!SENSITIVE_HEADERS.has(key.toLowerCase())) sanitized[key] = val;
      }
      event.request.headers = sanitized;
    }
  }

  // Redact any email-shaped string anywhere else in the event (message,
  // exception values, extra, contexts, remaining header values, …).
  return scrubValue(event);
}
