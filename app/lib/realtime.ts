// Server-only realtime signalling. Mutations broadcast a signal-only "change"
// event on an HMAC-derived channel; subscribed clients refetch through their
// existing authenticated endpoints (the payload carries no data). Never import
// this from client code — it reads SUPABASE_SERVICE_ROLE_KEY and SESSION_SECRET.

import { createHmac } from "crypto";
import { supabaseUrl, useSupabase } from "./supabase";

export type RealtimeScope = "orders" | "tables" | "table";

/**
 * Unguessable channel name for a scope: hmac_sha256(SESSION_SECRET,
 * `${scope}:${id}`) hex. The same secret already signs session cookies, so a
 * channel name reveals nothing and cannot be used to derive other scopes'.
 * Returns null when the Supabase backend or SESSION_SECRET is absent (disk dev
 * or misconfigured prod — prod fails closed) → callers fall back to polling.
 */
export function channelName(scope: RealtimeScope, id: string): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!useSupabase || !secret) return null;
  return createHmac("sha256", secret).update(`${scope}:${id}`).digest("hex");
}

/**
 * Fire-and-forget signal on a channel: empty payload, clients refetch their own
 * authenticated endpoints on receipt. No-op unless the Supabase backend is
 * configured; never awaited on the mutation hot path (latency must not change).
 */
export function notify(scope: RealtimeScope, id: string): void {
  if (!useSupabase) return;
  const topic = channelName(scope, id);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!topic || !key) return;
  fetch(`${supabaseUrl()}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: key,
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      messages: [{ topic, event: "change", payload: {} }],
    }),
  }).catch(() => {
    /* best-effort: a lost signal just means clients see the change on their
       next local mutation instead */
  });
}
