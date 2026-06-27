// Lazily-created, memoized Supabase service-role client. Shared by the relational
// store backend. The client uses the service-role key (server-only) so it can
// read/write every row; never import this into client code.

import type { SupabaseClient } from "@supabase/supabase-js";

/** True when the relational Supabase backend is configured. */
export const useSupabase = !!process.env.SUPABASE_URL;

// createClient() wants the bare project URL (https://xxxx.supabase.co), but the
// dashboard also surfaces the REST endpoint (…/rest/v1/) and people paste that
// by mistake — which silently breaks every query. Strip any /rest/v1 suffix and
// trailing slash so either form works.
export function supabaseUrl(): string {
  const raw = (process.env.SUPABASE_URL ?? "").trim();
  return raw.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

let _sb: SupabaseClient | undefined;

export async function sb(): Promise<SupabaseClient> {
  if (!_sb) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
      // Misconfiguration: URL set but no service-role key. Fail loudly rather
      // than letting writes silently no-op (which looks like "state resets").
      throw new Error(
        "store: SUPABASE_URL is set but SUPABASE_SERVICE_ROLE_KEY is missing",
      );
    }
    const { createClient } = await import("@supabase/supabase-js");
    _sb = createClient(supabaseUrl(), key, {
      auth: { persistSession: false },
      global: {
        // Next.js patches global fetch and CACHES it by default — which would
        // serve STALE rows (expired sessions still valid, payments not seen).
        // Force every PostgREST request to bypass the Data Cache.
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: "no-store" }),
      },
    });
  }
  return _sb;
}
