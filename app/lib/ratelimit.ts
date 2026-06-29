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

// Optional shared (cross-instance) limiter backed by an Upstash-compatible KV
// REST endpoint (KV_REST_API_URL / KV_REST_API_TOKEN). When unconfigured this is
// a no-op and the in-memory limiter above is the only guard (current behavior).
// Fail-OPEN on any KV error so a KV outage can't lock out legitimate users.
const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const kvConfigured = !!(KV_URL && KV_TOKEN);

export async function allowDistributed(
  key: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  // Always apply the fast per-instance cap first (cheap, and the only guard when
  // KV isn't configured).
  if (!allow(key, max, windowMs)) return false;
  if (!kvConfigured) return true;
  try {
    const seconds = Math.max(1, Math.ceil(windowMs / 1000));
    const res = await fetch(`${KV_URL}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KV_TOKEN}`, "content-type": "application/json" },
      // INCR the counter, then set a TTL only if the key has none (NX) so the
      // window doesn't keep resetting under sustained load.
      body: JSON.stringify([
        ["INCR", `rl:${key}`],
        ["EXPIRE", `rl:${key}`, seconds, "NX"],
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(800),
    });
    if (!res.ok) return true; // fail-open to the in-memory result
    const data = (await res.json()) as Array<{ result?: unknown }>;
    const count = Array.isArray(data) ? Number(data[0]?.result) : NaN;
    if (!Number.isFinite(count)) return true;
    return count <= max;
  } catch {
    return true; // KV unreachable — don't block legitimate users
  }
}

/**
 * Client IP for rate-limit keys. Prefers `x-real-ip` — on Vercel the edge sets
 * it to the genuine client IP, whereas the LEFTMOST `x-forwarded-for` entry is
 * client-spoofable (rotating it would mint a fresh bucket every request and
 * defeat the limit). Falls back to XFF only for local/non-Vercel dev.
 */
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const xff = req.headers.get("x-forwarded-for");
  return (xff?.split(",")[0] || "unknown").trim();
}
