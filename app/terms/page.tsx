import Link from "next/link";
import { BrandHeader } from "../components/site/BrandHeader";
import { SITE } from "../lib/site";

export const metadata = { title: "Terms of Service — QPay" };

export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#0B1221" }}>
      <BrandHeader />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px", lineHeight: 1.7 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em" }}>
          Terms of Service
        </h1>
        <p style={{ color: "#64748B", fontWeight: 600 }}>
          {SITE.company} · last updated {SITE.legalUpdated}
        </p>
        <p style={{ color: "#334155" }}>
          By using QPay you agree to use it lawfully for accepting restaurant
          payments. The service is provided as-is; this prototype demonstrates a
          scan-to-pay flow and is not a production payment processor.
        </p>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 28 }}>Accounts</h2>
        <p style={{ color: "#334155" }}>
          Admin accounts are issued by the operator. You are responsible for
          keeping your credentials confidential.
        </p>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 28 }}>Contact</h2>
        <p style={{ color: "#334155" }}>Questions? Call {SITE.salesPhone}.</p>
        <p style={{ marginTop: 32 }}>
          <Link href="/" style={{ color: "#2E5BFF", fontWeight: 700 }}>
            ← Back to home
          </Link>
        </p>
      </main>
    </div>
  );
}
