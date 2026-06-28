"use client";

// EN <-> العربية toggle. Writes the locale cookie and reloads so the server
// re-renders the whole tree with the right lang + dir (RTL) and translations.

import { useLocale } from "../../lib/i18n-client";
import { LOCALE_COOKIE, type Locale } from "../../lib/i18n";
import { C, R } from "../../lib/theme";

export function LanguageToggle({ onDark = false }: { onDark?: boolean }) {
  const locale = useLocale();
  const next: Locale = locale === "ar" ? "en" : "ar";
  const label = locale === "ar" ? "EN" : "العربية";

  const switchTo = () => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    if (typeof window !== "undefined") window.location.reload();
  };

  return (
    <button
      type="button"
      onClick={switchTo}
      className="qp-cta-lift"
      aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: R.pill,
        border: `1px solid ${onDark ? "rgba(255,255,255,0.22)" : C.borderStrong}`,
        background: "transparent",
        color: onDark ? "#fff" : C.text,
        fontFamily: "inherit",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        lineHeight: 1,
      }}
    >
      {label}
    </button>
  );
}
