import type { MetadataRoute } from "next";

const SITE_URL = "https://nuqra.org";
const MARKETING_PATHS = ["/", "/demo", "/contact", "/privacy", "/terms"];

// Both the English and Arabic (/ar-prefixed) URL for each marketing page, each
// entry cross-linking to its sibling in `alternates.languages` — Next does not
// add a self-referencing hreflang automatically, so both are listed explicitly.
export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const path of MARKETING_PATHS) {
    const enUrl = `${SITE_URL}${path}`;
    const arUrl = `${SITE_URL}${path === "/" ? "/ar" : `/ar${path}`}`;
    const languages = { en: enUrl, ar: arUrl };
    entries.push({ url: enUrl, alternates: { languages } });
    entries.push({ url: arUrl, alternates: { languages } });
  }
  return entries;
}
