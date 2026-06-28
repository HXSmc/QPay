"use client";

// Client-side locale access. The server layout reads the locale cookie and
// passes it to <LocaleProvider>, so client components get the correct locale
// with no hydration mismatch. Switching language is a cookie write + reload
// (see LanguageToggle), which re-renders the server tree with the new dir/lang.

import { createContext, useContext } from "react";
import { t, type Locale } from "./i18n";

const LocaleContext = createContext<Locale>("en");

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Returns a translate fn bound to the current locale: const tr = useT(); tr("Sign in"). */
export function useT(): (s: string) => string {
  const locale = useContext(LocaleContext);
  return (s: string) => t(s, locale);
}
