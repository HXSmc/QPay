import { cookies } from "next/headers";
import { LOCALE_COOKIE, isLocale, type Locale } from "./i18n";

/** Read the current locale from the cookie in a Server Component. */
export async function getServerLocale(): Promise<Locale> {
  const c = await cookies();
  const v = c.get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : "en";
}
