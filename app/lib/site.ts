// Single source of truth for public marketing copy / business data that was
// previously scattered as inline literals across MarketingView + SalesDropdown.
// Edit here, not in the components.

export const SITE = {
  company: "Nuqra Inc.",
  /** Copyright year — a constant (not `new Date()`) so static prerender and
   *  client hydration always agree and it can't silently drift mid-year. */
  copyrightYear: 2026,
  /** Real last-revision date for the legal pages (bump when the text changes). */
  legalUpdated: "June 2026",
  /** Sales contact (also used for the tel: link + clipboard copy). */
  salesPhone: "+966566201233",
  /** Sales email — used in the "contact sales" demo email + sender reply-to. */
  salesEmail: "sales@nuqra.com",
  /** Dedicated contact for privacy / data requests. */
  privacyEmail: "privacy@nuqra.com",
  salesHours: "Sun-Thu · 9am-6pm",
  /** Hero risk-reversal microline (honest, matches the /demo free trial). */
  heroBadge: "7-day free trial · No card · Live in minutes",
  /** Honest capability line (no unverifiable certifications). */
  trustLine: "No app for diners · Works with your POS · Encrypted payments",
  /** Short footer reassurance. */
  footerClaim: "7-day free trial · Cancel anytime",
  /** ROI metrics band. */
  metrics: [
    { value: "15", unit: "min", label: "saved per table" },
    { value: "+30", unit: "%", label: "average tip increase" },
    { value: "+22", unit: "%", label: "table turnover" },
  ],
} as const;
