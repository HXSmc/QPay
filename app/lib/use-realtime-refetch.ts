"use client";

// Single live-refresh hook replacing the per-page 3s polls. Exactly two
// branches, gated on one env (NEXT_PUBLIC_SUPABASE_URL):
//   • realtime — a channel name is available AND the public Supabase env is
//     set: subscribe to signal-only broadcasts, refetch on "change". No timer.
//   • fallback — the only 3s interval left in the app: refetch on a timer that
//     skips ticks while the tab is hidden.
// Channel semantics: `undefined` = inactive (no subscription, no interval —
// CustomerView uses this once a bill is fullyPaid); `null` = no channel
// (disk dev) → fallback; string = realtime (falls back if the env is unset).

import { useEffect } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const FALLBACK_POLL_MS = 3000;

// Module-memoized browser client. The anon key is public by design; it only
// lets browsers subscribe to broadcast channels.
let browserClient: SupabaseClient | null | undefined;

function realtimeClient(): SupabaseClient | null {
  if (browserClient !== undefined) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  browserClient =
    url && anon
      ? createClient(url, anon, {
          realtime: { params: { eventsPerSecond: 2 } },
        })
      : null;
  return browserClient;
}

export function useRealtimeRefetch(
  channel: string | null | undefined,
  refetch: () => void,
  opts?: { fallbackMs?: number },
): void {
  useEffect(() => {
    if (channel === undefined) return;
    const client = channel ? realtimeClient() : null;
    if (channel && client) {
      const ch = client
        .channel(channel, { config: { broadcast: { self: false } } })
        .on("broadcast", { event: "change" }, () => refetch())
        .subscribe();
      return () => {
        void client.removeChannel(ch);
      };
    }
    const id = setInterval(() => {
      if (!document.hidden) refetch();
    }, opts?.fallbackMs ?? FALLBACK_POLL_MS);
    return () => clearInterval(id);
  }, [channel, refetch, opts?.fallbackMs]);
}
