import Link from "next/link";
import { BrandHeader } from "../components/site/BrandHeader";
import { SITE } from "../lib/site";
import { C, S, T } from "../lib/theme";

export const metadata = { title: "Terms of service · Nuqra" };

export default function TermsPage() {
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
        <h1 style={{ ...T.h1, margin: 0 }}>Terms of service</h1>
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
          By using Nuqra you agree to use it lawfully for accepting restaurant
          payments. The service is provided as-is; this prototype demonstrates a
          scan-to-pay flow and is not a production payment processor.
        </p>

        <h2 style={{ ...T.h2, marginTop: S[7], marginBottom: S[3] }}>Accounts</h2>
        <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, margin: 0 }}>
          Admin accounts are issued by the operator. You are responsible for
          keeping your credentials confidential.
        </p>

        <h2 style={{ ...T.h2, marginTop: S[7], marginBottom: S[3] }}>Contact</h2>
        <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, margin: 0 }}>
          Questions? Call {SITE.salesPhone}.
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
