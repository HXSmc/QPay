import Link from "next/link";
import { BrandHeader } from "../components/site/BrandHeader";
import { SITE } from "../lib/site";
import { C, S, T } from "../lib/theme";

export const metadata = { title: "Privacy policy · QPay" };

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: C.surface, color: C.text }}>
      <BrandHeader />
      <article
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: `${S[7]}px ${S[5]}px ${S[8]}px`,
        }}
      >
        <h1 style={{ ...T.h1, margin: 0 }}>Privacy policy</h1>
        <p
          style={{
            ...T.caption,
            color: C.muted,
            marginTop: S[2],
            marginBottom: S[6],
          }}
        >
          {SITE.company} · last updated {SITE.legalUpdated}
        </p>

        <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, marginTop: 0 }}>
          QPay processes the minimum data needed to run scan-to-pay: table and
          order details, payment records, and (for demo requests) the name,
          email, and restaurant you submit. We do not sell personal data.
        </p>

        <h2 style={{ ...T.h2, marginTop: S[7], marginBottom: S[3] }}>
          What we collect
        </h2>
        <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, margin: 0 }}>
          Account credentials (stored only as salted hashes), restaurant settings,
          live table/order state, payment ledger entries, and demo-request leads.
        </p>

        <h2 style={{ ...T.h2, marginTop: S[7], marginBottom: S[3] }}>Contact</h2>
        <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, margin: 0 }}>
          For privacy or data requests, email {SITE.privacyEmail} (or call{" "}
          {SITE.salesPhone}).
        </p>

        <p style={{ marginTop: S[7] }}>
          <Link
            href="/"
            style={{ ...T.label, color: C.brand, textDecoration: "none" }}
          >
            ← Back to home
          </Link>
        </p>
      </article>
    </div>
  );
}
