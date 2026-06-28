import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const SITE_TITLE = "QPay · QR Payments for Restaurants";
const SITE_DESCRIPTION =
  "Turn tables faster with QR payments. Diners scan, split, tip, and pay in under 30 seconds.";

export const metadata: Metadata = {
  metadataBase: new URL("https://qpay.com"),
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={jakarta.className}>
        {/* Single top-level landmark so every route exposes a <main> region
            (WCAG 1.3.1 / landmark-one-main) for assistive-tech navigation. */}
        <main>{children}</main>
      </body>
    </html>
  );
}
