"use client";

// EN <-> العربية toggle. Writes the locale cookie, then either:
//  - on a marketing route (/, /demo, /contact, /privacy, /terms), NAVIGATES to
//    the sibling /ar/* path (those routes are mirrored per-locale for SEO), or
//  - elsewhere (admin/customer app surfaces), reloads in place as before.

import { usePathname } from "next/navigation";
import { useLocale } from "../../lib/i18n-client";
import { LOCALE_COOKIE, type Locale } from "../../lib/i18n";
import { C, R } from "../../lib/theme";

// Marketing routes mirrored under /ar/* by the site's locale-path routing.
const MARKETING_ROUTES = ["/", "/demo", "/contact", "/privacy", "/terms"];

export function LanguageToggle({
  onDark = false,
  borderColor,
}: {
  onDark?: boolean;
  borderColor?: string;
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const next: Locale = locale === "ar" ? "en" : "ar";
  const label = locale === "ar" ? "EN" : "العربية";

  const switchTo = () => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    const path = pathname || "/";
    const base = path === "/ar" || path.startsWith("/ar/") ? path.slice(3) || "/" : path;
    if (MARKETING_ROUTES.includes(base)) {
      const target = next === "ar" ? (base === "/" ? "/ar" : `/ar${base}`) : base;
      if (typeof window !== "undefined") window.location.href = target;
      return;
    }
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
        border: `1px solid ${onDark ? "rgba(255,255,255,0.22)" : (borderColor ?? C.borderStrong)}`,
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
