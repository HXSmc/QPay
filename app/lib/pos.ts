// Single source of truth for the POS systems Nuqra can integrate with, plus the
// per-POS credential fields an admin fills in (admin → Settings → POS
// integration) to complete the connection. Used by:
//   • the marketing demo + contact forms (the "used POS system" selector),
//   • the admin settings page (selector + the matching credential fields),
//   • app/lib/integrations/pos.ts (the inert integration client that reads
//     these fields once they're filled).
//
// The list is curated for the Saudi / GCC restaurant market but is just data —
// edit POS_SYSTEMS / POS_FIELDS to add or remove a system. Nothing here touches
// I/O; it's pure config so both the client forms and the server agree.

/** One credential/config input for a POS integration. */
export interface PosField {
  /** Stable key persisted in settings.posConfig (e.g. "apiKey"). */
  key: string;
  /** Human label (English source string; localized via i18n at render). */
  label: string;
  /** Placeholder / example value. */
  placeholder?: string;
  /** Secret values (API keys/tokens) render masked. */
  secret?: boolean;
  /** Required to consider the integration "connected". */
  required?: boolean;
}

export interface PosSystem {
  /** Stable id persisted in settings.posSystem and leads.pos_system. */
  id: string;
  /** Display name. */
  name: string;
}

// The selectable POS systems. `none` and `other` bookend the real list so the
// forms always have a sensible first/last option.
export const POS_SYSTEMS: PosSystem[] = [
  { id: "none", name: "No POS yet / not sure" },
  // KSA / GCC market favourites first.
  { id: "foodics", name: "Foodics" },
  { id: "marn", name: "Marn (مرن)" },
  { id: "arqami", name: "Arqami (أرقامي)" },
  { id: "anywhere", name: "Anywhere POS" },
  { id: "posrocket", name: "POSRocket" },
  { id: "sapaad", name: "Sapaad" },
  { id: "posist", name: "Posist" },
  { id: "omega", name: "Omega POS" },
  { id: "surge", name: "Surge POS" },
  { id: "ace", name: "ACE POS" },
  { id: "aqua", name: "AQUA POS" },
  { id: "pos_bank", name: "POS BANK" },
  { id: "infrasys", name: "Infrasys (Shiji) Cloud" },
  { id: "ls_retail", name: "LS Retail / LS Central" },
  { id: "pixelpoint", name: "PixelPoint POS" },
  { id: "odoo", name: "Odoo POS" },
  { id: "lightspeed", name: "Lightspeed" },
  { id: "oracle_simphony", name: "Oracle MICROS Simphony" },
  { id: "micros", name: "Oracle MICROS (RES 3700)" },
  { id: "ncr_aloha", name: "NCR Aloha" },
  { id: "square", name: "Square" },
  { id: "toast", name: "Toast" },
  { id: "clover", name: "Clover" },
  { id: "lavu", name: "Lavu" },
  { id: "revel", name: "Revel Systems" },
  { id: "touchbistro", name: "TouchBistro" },
  { id: "other", name: "Other (tell us which)" },
];

const POS_IDS = new Set(POS_SYSTEMS.map((p) => p.id));

/** True if `id` is one of the known POS systems. */
export function isPosSystem(id: unknown): id is string {
  return typeof id === "string" && POS_IDS.has(id);
}

/** Display name for a POS id (falls back to the raw id). */
export function posName(id: string | undefined | null): string {
  if (!id) return "";
  return POS_SYSTEMS.find((p) => p.id === id)?.name ?? id;
}

// Reusable field shapes.
const APITOKEN: PosField = { key: "apiToken", label: "API token", placeholder: "Paste the token from your POS dashboard", secret: true, required: true };
const APIKEY: PosField = { key: "apiKey", label: "API key", placeholder: "Your POS API key", secret: true, required: true };
const APISECRET: PosField = { key: "apiSecret", label: "API secret", placeholder: "Your POS API secret", secret: true, required: true };
const LOCATION: PosField = { key: "locationId", label: "Location / branch ID", placeholder: "e.g. 1024", required: true };

// Per-POS credential fields. Anything not listed uses GENERIC_FIELDS so every
// system in the selector has a working integration form out of the box.
const GENERIC_FIELDS: PosField[] = [APIKEY, LOCATION];

export const POS_FIELDS: Record<string, PosField[]> = {
  none: [],
  other: [
    { key: "systemName", label: "POS system name", placeholder: "Which POS do you use?", required: true },
    APIKEY,
    { key: "notes", label: "Notes for our team", placeholder: "Anything we should know to connect it" },
  ],
  foodics: [APITOKEN, { key: "branchId", label: "Branch ID", placeholder: "Foodics branch ID", required: true }],
  marn: [APIKEY, { key: "branchId", label: "Branch ID", placeholder: "Marn branch ID", required: true }],
  anywhere: [APIKEY, { key: "outletId", label: "Outlet ID", placeholder: "Anywhere outlet ID", required: true }],
  posrocket: [APIKEY, LOCATION],
  odoo: [
    { key: "instanceUrl", label: "Instance URL", placeholder: "https://yourco.odoo.com", required: true },
    { key: "database", label: "Database name", placeholder: "yourco", required: true },
    APIKEY,
  ],
  lightspeed: [{ key: "accountId", label: "Account ID", placeholder: "Lightspeed account ID", required: true }, APIKEY],
  oracle_simphony: [
    { key: "orgId", label: "Organization ID", placeholder: "Simphony org ID", required: true },
    APIKEY,
    LOCATION,
  ],
  ncr_aloha: [{ key: "siteId", label: "Site ID", placeholder: "Aloha site ID", required: true }, APIKEY],
  square: [{ key: "accessToken", label: "Access token", placeholder: "Square access token", secret: true, required: true }, LOCATION],
  toast: [
    { key: "clientId", label: "Client ID", placeholder: "Toast client ID", required: true },
    { key: "clientSecret", label: "Client secret", placeholder: "Toast client secret", secret: true, required: true },
    { key: "restaurantGuid", label: "Restaurant GUID", placeholder: "Toast restaurant GUID", required: true },
  ],
  clover: [{ key: "merchantId", label: "Merchant ID", placeholder: "Clover merchant ID", required: true }, APITOKEN],
  lavu: [APIKEY, { key: "dataname", label: "Dataname", placeholder: "Lavu dataname", required: true }],
  revel: [APIKEY, APISECRET, { key: "establishmentId", label: "Establishment ID", placeholder: "Revel establishment ID", required: true }],
  touchbistro: [APIKEY, { key: "venueId", label: "Venue ID", placeholder: "TouchBistro venue ID", required: true }],
  // On-prem / server-hosted systems need a host to reach in addition to a key.
  infrasys: [{ key: "serverUrl", label: "Server URL", placeholder: "https://your-infrasys-host", required: true }, APIKEY, LOCATION],
  ls_retail: [{ key: "serverUrl", label: "Server / web service URL", placeholder: "https://your-ls-host", required: true }, APIKEY, { key: "storeId", label: "Store ID", placeholder: "LS store no.", required: true }],
  micros: [{ key: "serverUrl", label: "Server URL", placeholder: "https://your-micros-host", required: true }, APIKEY, LOCATION],
};

/** Credential fields for a POS id (generic set for any without an override). */
export function posFields(id: string | undefined | null): PosField[] {
  if (!id || id === "none") return [];
  return POS_FIELDS[id] ?? GENERIC_FIELDS;
}

/** Secret field keys for a POS (API keys/tokens — encrypted at rest). Used by
 *  pos-secrets.ts to decide which posConfig fields to encrypt/decrypt. */
export function posSecretKeys(id: string | undefined | null): string[] {
  return posFields(id).filter((f) => f.secret).map((f) => f.key);
}

export type PosConnection = "none" | "incomplete" | "connected";

/**
 * Connection state for a chosen POS + its saved config. Pure: no network. The
 * real integration client (app/lib/integrations/pos.ts) only acts when this
 * returns "connected".
 */
export function posConnection(
  posSystem: string | undefined | null,
  config: Record<string, string> | undefined | null,
): PosConnection {
  if (!posSystem || posSystem === "none") return "none";
  const fields = posFields(posSystem);
  const required = fields.filter((f) => f.required);
  if (required.length === 0) return "none";
  const cfg = config ?? {};
  const filled = required.every((f) => (cfg[f.key] ?? "").trim().length > 0);
  return filled ? "connected" : "incomplete";
}

/** Strip a posConfig to only the keys valid for the chosen system (+ trim). */
export function sanitizePosConfig(
  posSystem: string | undefined | null,
  config: Record<string, unknown> | undefined | null,
): Record<string, string> {
  const fields = posFields(posSystem);
  const out: Record<string, string> = {};
  if (!config || typeof config !== "object") return out;
  for (const f of fields) {
    const v = (config as Record<string, unknown>)[f.key];
    if (typeof v === "string" && v.trim()) out[f.key] = v.trim().slice(0, 400);
  }
  return out;
}
