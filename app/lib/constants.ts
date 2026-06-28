// Shared constants — single source of truth for values that were previously
// duplicated across the two store backends (a DRY hazard: a change in one place
// silently diverging from the other).

/**
 * The single super account that provisions admins. Overridable via env; the
 * source defaults are only ever used in non-production (prod fails closed if the
 * env vars are unset — see ensureSuperadmin). The password is only ever stored
 * as a PBKDF2 digest.
 */
export const SUPER_EMAIL = (process.env.SUPERADMIN_EMAIL || "AliTheAdmin@gmail.com")
  .trim()
  .toLowerCase();
export const SUPER_PASSWORD = process.env.SUPERADMIN_PASSWORD || "QPayAdmin_1";

/** Trial admins issued from the marketing demo form are valid this many days. */
export const TRIAL_DAYS = 7;

/** Default renewal granted from the superadmin console. */
export const RENEW_DAYS = 30;
