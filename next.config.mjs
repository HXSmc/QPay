/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy. The app uses inline styles everywhere (inline-style
// design system) and Next injects an inline bootstrap script, so style-src and
// script-src must allow 'unsafe-inline'. Dev (React Refresh) also needs
// 'unsafe-eval'. Menus load from the public Vercel Blob store (images/PDFs) and
// the client uploader PUTs to *.vercel-storage.com.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // The browser only fetches /api (self) and PUTs menu uploads to the Blob store;
  // Supabase is server-side only, so it's not in connect-src.
  "connect-src 'self' https://*.vercel-storage.com",
  // PDF menus render in an <iframe> from the public Blob store (prod) or the
  // same-origin /uploads path (dev) — allow those, not blanket 'none'.
  "frame-src 'self' https://*.vercel-storage.com",
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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
