// In-memory fixed-window rate limiter for high-volume / abuse-prone endpoints
// (public pay/sync, admin-create). Per-serverless-instance — best-effort, not a
// global guarantee (a determined attacker hitting many instances bypasses it),
// but it adds meaningful protection WITHOUT writing to the shared store on every
// request (which would worsen the single-blob write bottleneck). The
// security-critical login lockout stays store-backed in app/lib/store.ts.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Returns true if the action is allowed for `key`, false if the limit is hit.
 * `max` requests per `windowMs`. Prunes expired buckets opportunistically.
 */
export function allow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    // Opportunistic cleanup so the map can't grow unbounded.
    if (buckets.size > 5000) {
      buckets.forEach((v, k) => {
        if (v.resetAt <= now) buckets.delete(k);
      });
    }
    return true;
  }
  if (b.count >= max) return false;
  b.count++;
  return true;
}

/** First client IP from proxy headers (best effort). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return (xff?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}
