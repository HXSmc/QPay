// Lightweight i18n. Translation is keyed by the ENGLISH source string, so a
// component just wraps a visible string in t(...) - no key invention needed, and
// any string without an Arabic entry gracefully falls back to English (nothing
// can break from a missing translation). Locale lives in a cookie; the toggle
// reloads so the server re-renders with the right lang + dir.
//
// Arabic dictionaries are split per surface (app/lib/i18n/ar-*.ts) so they can
// be edited independently, then merged here.

import { ar as arCommon } from "./i18n/ar-common";
import { ar as arMarketing } from "./i18n/ar-marketing";
import { ar as arCustomer } from "./i18n/ar-customer";
import { ar as arAdmin } from "./i18n/ar-admin";
import { ar as arAdminDash } from "./i18n/ar-admin-dash";
import { ar as arAdminOps } from "./i18n/ar-admin-ops";
import { ar as arAdminTables } from "./i18n/ar-admin-tables";
import { ar as arAdminSuper } from "./i18n/ar-admin-super";

export type Locale = "en" | "ar";

export const LOCALE_COOKIE = "nuqra_locale";

const AR: Record<string, string> = {
  ...arCommon,
  ...arMarketing,
  ...arCustomer,
  ...arAdmin,
  ...arAdminDash,
  ...arAdminOps,
  ...arAdminTables,
  ...arAdminSuper,
};

export function isLocale(v: string | undefined | null): v is Locale {
  return v === "en" || v === "ar";
}

export function dir(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

/** Translate an English source string for the given locale (EN passthrough). */
export function t(s: string, locale: Locale): string {
  return locale === "ar" ? AR[s] ?? s : s;
}
