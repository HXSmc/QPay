import { BrandHeader } from "./components/site/BrandHeader";
import { LandingView } from "./components/immersive/LandingView";
import { NOIR } from "./lib/theme";

// Organization + SoftwareApplication structured data. No ratings/reviews:
// nothing here is unverifiable. Shape preserved from the previous page; only
// the description copy is polished.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Nuqra",
      alternateName: "نقرة",
      url: "https://nuqra.org",
      logo: "https://nuqra.org/icon.svg",
    },
    {
      "@type": "SoftwareApplication",
      name: "Nuqra",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      areaServed: "SA",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "SAR",
        description: "7-day free trial, flat monthly fee per branch, no commission",
      },
    },
  ],
};

export default function Page() {
  return (
    <div
      style={{
        minHeight: "100vh",
        // Full Noir canvas for the immersive landing (DIRECTION §10.1: dark,
        // full scroll narrative). Theme-locked for this surface, no mid-page flip.
        background: NOIR.canvas,
        color: NOIR.text,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <BrandHeader variant="noir" />
      <LandingView />
    </div>
  );
}
