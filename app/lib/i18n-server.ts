import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, isLocale, type Locale } from "./i18n";

/**
 * Read the current locale in a Server Component. The `x-locale` request
 * header (set by middleware when rewriting an /ar path) takes priority so
 * Arabic marketing URLs render Arabic regardless of the visitor's cookie;
 * everything else falls back to the existing cookie.
 */
export async function getServerLocale(): Promise<Locale> {
  const h = await headers();
  const headerLocale = h.get("x-locale");
  if (isLocale(headerLocale)) return headerLocale;
  const c = await cookies();
  const v = c.get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : "en";
}
