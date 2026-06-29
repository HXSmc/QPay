// POS integration layer. This is the real seam where Nuqra talks to a
// restaurant's point-of-sale. Each POS gets a `PosAdapter`; the registry maps a
// POS id (see app/lib/pos.ts) to its adapter. Adapters make real, read-only API
// calls to verify credentials so an admin can confirm a connection from Settings
// before anything money-touching is wired.
//
// Secrets arrive here already DECRYPTED (the store decrypts on read); they are
// used only for the outbound request and never logged or returned to the client.
//
// Adding a POS = implement an adapter + register it. Systems without an adapter
// yet fall back to `genericAdapter`, which reports "not yet automated" rather
// than pretending success.

import { posConnection, posFields, posName, type PosConnection } from "../pos";
import type { RestaurantSettings } from "../types";

export interface PosStatus {
  system: string;
  name: string;
  connection: PosConnection;
  /** Required field keys still empty. */
  missing: string[];
}

/** Derive a POS integration status from settings (pure, no network). */
export function posStatus(settings: RestaurantSettings): PosStatus {
  const system = settings.posSystem ?? "";
  const config = settings.posConfig ?? {};
  return {
    system,
    name: posName(system),
    connection: posConnection(system, config),
    missing: posFields(system)
      .filter((f) => f.required && !(config[f.key] ?? "").trim())
      .map((f) => f.key),
  };
}

// ---------------------------------------------------------------------------
// Adapter framework
// ---------------------------------------------------------------------------

export interface PosContext {
  posSystem: string;
  /** Decrypted, flat config (apiToken, branchId, ...). */
  config: Record<string, string>;
}

export interface PosVerifyResult {
  ok: boolean;
  /** Human-readable, safe to show the admin (never contains the secret). */
  message: string;
  /** False when this POS has no automated verification yet. */
  automated: boolean;
}

export interface PosAdapter {
  id: string;
  /** Read-only credential check against the POS API. */
  verify(ctx: PosContext): Promise<PosVerifyResult>;
}

const TIMEOUT_MS = 8000;

/** fetch with an abort timeout so a hung POS endpoint can't stall the request. */
async function fetchT(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
  } finally {
    clearTimeout(t);
  }
}

// --- Foodics (https://developers.foodics.com) ------------------------------
const foodicsAdapter: PosAdapter = {
  id: "foodics",
  async verify({ config }) {
    const token = config.apiToken?.trim();
    if (!token) return { ok: false, automated: true, message: "Add your Foodics API token." };
    try {
      const res = await fetchT("https://api.foodics.com/v5/branches?per_page=1", {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (res.status === 401 || res.status === 403) {
        return { ok: false, automated: true, message: "Foodics rejected the token. Check it and try again." };
      }
      if (!res.ok) {
        return { ok: false, automated: true, message: `Foodics returned ${res.status}. Try again shortly.` };
      }
      return { ok: true, automated: true, message: "Connected to Foodics." };
    } catch {
      return { ok: false, automated: true, message: "Couldn't reach Foodics. Check your connection." };
    }
  },
};

// --- Square (https://developer.squareup.com) -------------------------------
const squareAdapter: PosAdapter = {
  id: "square",
  async verify({ config }) {
    const token = config.accessToken?.trim();
    if (!token) return { ok: false, automated: true, message: "Add your Square access token." };
    try {
      const res = await fetchT("https://connect.squareup.com/v2/locations", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Square-Version": "2024-07-17",
          Accept: "application/json",
        },
      });
      if (res.status === 401) {
        return { ok: false, automated: true, message: "Square rejected the token. Check it and try again." };
      }
      if (!res.ok) {
        return { ok: false, automated: true, message: `Square returned ${res.status}. Try again shortly.` };
      }
      return { ok: true, automated: true, message: "Connected to Square." };
    } catch {
      return { ok: false, automated: true, message: "Couldn't reach Square. Check your connection." };
    }
  },
};

// --- Generic fallback ------------------------------------------------------
const genericAdapter: PosAdapter = {
  id: "generic",
  async verify() {
    return {
      ok: false,
      automated: false,
      message: "Saved. Our team verifies this POS manually and will confirm shortly.",
    };
  },
};

const REGISTRY: Record<string, PosAdapter> = {
  foodics: foodicsAdapter,
  square: squareAdapter,
};

/** The adapter for a POS id (generic fallback for systems without one yet). */
export function posAdapter(posSystem: string | undefined | null): PosAdapter {
  return (posSystem && REGISTRY[posSystem]) || genericAdapter;
}

/** Whether a POS has an automated verifier (drives the Test button copy). */
export function hasAutomatedVerify(posSystem: string | undefined | null): boolean {
  return !!(posSystem && REGISTRY[posSystem]);
}

/**
 * Verify a POS connection with a real read-only API call. Returns a safe,
 * displayable result. Requires the config to be complete first.
 */
export async function verifyPosConnection(
  posSystem: string,
  config: Record<string, string>,
): Promise<PosVerifyResult> {
  if (posConnection(posSystem, config) === "incomplete") {
    return { ok: false, automated: true, message: "Fill in the required fields first." };
  }
  return posAdapter(posSystem).verify({ posSystem, config });
}

/**
 * Outbound sync seam (e.g. push a placed Nuqra order to the POS). Stays inert
 * until a writing adapter is implemented, so callers can wire it now safely.
 */
export async function pushOrder(
  settings: RestaurantSettings,
): Promise<{ ok: boolean; reason: "skipped" | "not-connected" }> {
  if (posStatus(settings).connection !== "connected") {
    return { ok: false, reason: "not-connected" };
  }
  return { ok: false, reason: "skipped" };
}
