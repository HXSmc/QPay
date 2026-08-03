import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { Geist, Geist_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { dir } from "./lib/i18n";
import { getServerLocale } from "./lib/i18n-server";
import { LocaleProvider } from "./lib/i18n-client";

// Geist for Latin (the Linear-clean signature), Geist Mono for ledger figures,
// IBM Plex Sans Arabic for RTL/Arabic copy.
const geist = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const mono = Geist_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-mono",
});
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-ar",
});

const SITE_URL = "https://nuqra.org";
const SITE_TITLE_EN = "Nuqra · QR Payments for Restaurants";
const SITE_DESCRIPTION_EN =
  "Turn tables faster with QR payments. Diners scan, split, tip, and pay in under 30 seconds.";
const SITE_TITLE_AR = "نقرة · مدفوعات QR للمطاعم";
const SITE_DESCRIPTION_AR =
  "أدِر طاولاتك بسرعة أكبر مع الدفع عبر QR، العملاء يمسحون، يقسمون الحساب، يضيفون البقشيش ويدفعون في أقل من ٣٠ ثانية.";

// Reads x-locale/x-pathname (set by middleware — see middleware.ts) so every
// route gets a correct canonical URL, hreflang alternates, and localized
// title/description without each page repeating this logic.
export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const locale = h.get("x-locale") === "ar" ? "ar" : "en";
  const pathname = h.get("x-pathname") || "/";

  // Strip a leading /ar to get the canonical (English) path, then rebuild the
  // Arabic sibling from that — avoids ever emitting a doubled /ar/ar prefix.
  const barePath = pathname === "/ar" ? "/" : pathname.startsWith("/ar/") ? pathname.slice(3) : pathname;
  const arPath = barePath === "/" ? "/ar" : `/ar${barePath}`;

  const title = locale === "ar" ? SITE_TITLE_AR : SITE_TITLE_EN;
  const description = locale === "ar" ? SITE_DESCRIPTION_AR : SITE_DESCRIPTION_EN;

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || SITE_URL),
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}${pathname}`,
      languages: {
        en: `${SITE_URL}${barePath}`,
        ar: `${SITE_URL}${arPath}`,
        "x-default": `${SITE_URL}${barePath}`,
      },
    },
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getServerLocale();
  return (
    <html lang={locale} dir={dir(locale)}>
      <body
        className={`${geist.className} ${mono.variable} ${arabic.variable}`}
        style={{ background: "#F6F7F9", color: "#0E1116" }}
      >
        {/* Single top-level landmark so every route exposes a <main> region
            (WCAG 1.3.1 / landmark-one-main) for assistive-tech navigation. */}
        <LocaleProvider locale={locale}>
          <main>{children}</main>
        </LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}
