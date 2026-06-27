import Link from "next/link";
import { BrandHeader } from "../components/site/BrandHeader";
import { SITE } from "../lib/site";

export const metadata = { title: "Privacy Policy — QPay" };

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#0B1221" }}>
      <BrandHeader />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px", lineHeight: 1.7 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em" }}>
          Privacy Policy
        </h1>
        <p style={{ color: "#64748B", fontWeight: 600 }}>
          {SITE.company} · last updated {SITE.legalUpdated}
        </p>
        <p style={{ color: "#334155" }}>
          QPay processes the minimum data needed to run scan-to-pay: table and
          order details, payment records, and (for demo requests) the name,
          email, and restaurant you submit. We do not sell personal data.
        </p>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 28 }}>What we collect</h2>
        <p style={{ color: "#334155" }}>
          Account credentials (stored only as salted hashes), restaurant settings,
          live table/order state, payment ledger entries, and demo-request leads.
        </p>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 28 }}>Contact</h2>
        <p style={{ color: "#334155" }}>
          For privacy or data requests, email {SITE.privacyEmail} (or call{" "}
          {SITE.salesPhone}).
        </p>
        <p style={{ marginTop: 32 }}>
          <Link href="/" style={{ color: "#2E5BFF", fontWeight: 700 }}>
            ← Back to home
          </Link>
        </p>
      </main>
    </div>
  );
}
