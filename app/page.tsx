import { BrandHeader } from "./components/site/BrandHeader";
import { Hero } from "./components/landing/Hero";
import { CommissionLeak } from "./components/landing/CommissionLeak";
import { TableCycleSection } from "./components/landing/TableCycleSection";
import { VerdictSection } from "./components/landing/VerdictSection";
import { HowItWorksSection } from "./components/landing/HowItWorksSection";
import { PricingSection } from "./components/landing/PricingSection";
import { ProofSection } from "./components/landing/ProofSection";
import { ClosingSection } from "./components/landing/ClosingSection";

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

// The "paper ledger" landing: one light design system top to bottom, the
// receipt as the interface. See app/components/landing/** for the section
// patterns (Section wrapper, GhostNumeral, Eyebrow) later sections follow.
export default function Page() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <BrandHeader />
      <Hero />
      <CommissionLeak />
      <TableCycleSection />
      <VerdictSection />
      <HowItWorksSection />
      <PricingSection />
      <ProofSection />
      <ClosingSection />
    </div>
  );
}
