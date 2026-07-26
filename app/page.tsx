import { BrandHeader } from "./components/site/BrandHeader";
import { MarketingView } from "./components/MarketingView";
import { C } from "./lib/theme";

// Organization + SoftwareApplication structured data. No ratings/reviews —
// nothing here is unverifiable.
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
        description: "7-day free trial",
      },
    },
  ],
};

export default function Page() {
  return (
    <div
      style={{
        minHeight: "100vh",
        // The hero glow lives on the page wrapper (not the hero box) so it spans
        // up BEHIND the transparent sticky navbar. Removes the visible seam where
        // flat canvas behind the nav used to meet the tinted hero just below it.
        background: `radial-gradient(120% 900px at 92% -70px, ${C.brandTint} 0%, ${C.canvas} 56%)`,
        color: C.text,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <BrandHeader />
      <MarketingView />
    </div>
  );
}
