import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";
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

const SITE_TITLE = "Nuqra · QR Payments for Restaurants";
const SITE_DESCRIPTION =
  "Turn tables faster with QR payments. Diners scan, split, tip, and pay in under 30 seconds.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://nuqra.org"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

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
      </body>
    </html>
  );
}
