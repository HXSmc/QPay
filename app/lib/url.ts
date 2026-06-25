/**
 * Public base URL for building QR targets and absolute links.
 * Prefers NEXT_PUBLIC_APP_URL (set to the production domain on Vercel) so QR
 * codes are deterministic regardless of where they're generated; falls back to
 * the browser origin for local dev.
 */
export function getAppBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
