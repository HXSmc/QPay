import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "QPay — QR Payments for Restaurants",
  description:
    "Turn tables faster with QR payments. Diners scan, split, tip, and pay in under 30 seconds.",
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
