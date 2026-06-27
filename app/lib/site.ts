// Single source of truth for public marketing copy / business data that was
// previously scattered as inline literals across MarketingView + SalesDropdown.
// Edit here, not in the components.

export const SITE = {
  company: "QPay Inc.",
  /** Copyright year — a constant (not `new Date()`) so static prerender and
   *  client hydration always agree and it can't silently drift mid-year. */
  copyrightYear: 2026,
  /** Real last-revision date for the legal pages (bump when the text changes). */
  legalUpdated: "June 2026",
  /** Sales contact (also used for the tel: link + clipboard copy). */
  salesPhone: "+966566201233",
  /** Dedicated contact for privacy / data requests. */
  privacyEmail: "privacy@qpay.com",
  salesHours: "Sun–Thu · 9am–6pm",
  /** Hero social-proof badge. */
  heroBadge: "Trusted by 3,200+ restaurants",
  /** Compliance/trust line under the hero. */
  trustLine: "PCI-DSS Level 1 · 256-bit encryption · SOC 2 Type II",
  /** Short footer compliance claim. */
  footerClaim: "PCI-DSS Level 1 Certified",
  /** ROI metrics band. */
  metrics: [
    { value: "15", unit: "min", label: "saved per table" },
    { value: "+30", unit: "%", label: "average tip increase" },
    { value: "+22", unit: "%", label: "table turnover" },
    { value: "4.9", unit: "★", label: "guest satisfaction" },
  ],
} as const;
