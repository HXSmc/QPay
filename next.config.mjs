import { fileURLToPath } from "node:url";
import path from "node:path";

/** @type {import('next').NextConfig} */

// ESM-safe __dirname. Needed because Next.js otherwise walks up from this
// file looking for a workspace root and stops at the first lockfile it
// finds — it was finding /Users/alimc/package-lock.json (a stray lockfile
// outside this project) and inferring /Users/alimc as the root instead of
// this project directory. Pinning outputFileTracingRoot fixes that without
// touching the unrelated file outside the project.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy. The app uses inline styles everywhere (inline-style
// design system) and Next injects an inline bootstrap script, so style-src and
// script-src must allow 'unsafe-inline'. Dev (React Refresh) also needs
// 'unsafe-eval'. Menus (images/PDFs) live in Supabase Storage, and the client
// uploader PUTs directly to it (app/lib/api.ts trySignedUpload).
//
// Pinned to the exact project ref, NOT https://*.supabase.co — a wildcard
// would whitelist every Supabase project on the internet as an upload/framing
// destination for this app.
const SUPABASE_STORAGE_ORIGIN = "https://rvcjvoqjrzjwdxsuckvh.supabase.co";
// Realtime opens its websocket against the same host over wss:// — derived, never a separate origin.
const SUPABASE_WS_ORIGIN = SUPABASE_STORAGE_ORIGIN
  ? SUPABASE_STORAGE_ORIGIN.replace(/^https:/, "wss:")
  : "";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // The browser fetches /api (self) and PUTs menu uploads directly to Supabase Storage.
  // FUTURE (GlitchTip error tracking): when the self-hosted GlitchTip server exists and
  // NEXT_PUBLIC_SENTRY_DSN is set, the client SDK will POST envelopes to the GlitchTip
  // host. Add that origin here, e.g. `connect-src 'self' ${SUPABASE_STORAGE_ORIGIN} ${SUPABASE_WS_ORIGIN} https://<glitchtip-host>`
  // (do NOT add it until the host is known and pinned — never a wildcard).
  `connect-src 'self' ${SUPABASE_STORAGE_ORIGIN}${SUPABASE_WS_ORIGIN ? ` ${SUPABASE_WS_ORIGIN}` : ""}`,
  // PDF menus render in an <iframe> from Supabase Storage (prod) or the
  // same-origin /uploads path (dev) — allow those, not blanket 'none'.
  `frame-src 'self' ${SUPABASE_STORAGE_ORIGIN}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig = {
  outputFileTracingRoot: __dirname,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
