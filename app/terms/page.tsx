import Link from "next/link";
import { BrandHeader } from "../components/site/BrandHeader";
import { SITE } from "../lib/site";
import { C, R, S, SHADOW, T } from "../lib/theme";

export const metadata = { title: "Terms of service · Nuqra" };

export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", background: C.canvas, color: C.text }}>
      <BrandHeader />
      <article
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: `${S[7]}px ${S[5]}px ${S[8]}px`,
        }}
      >
        <div
          style={{
            ...T.label,
            fontSize: 12.5,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: C.brand,
            marginBottom: S[3],
          }}
        >
          Legal
        </div>
        <h1
          style={{
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: "-0.035em",
            lineHeight: 1.08,
            margin: 0,
          }}
        >
          Terms of service
        </h1>
        <p
          style={{
            ...T.caption,
            color: C.muted,
            marginTop: S[3],
            marginBottom: S[6],
          }}
        >
          {SITE.company} · last updated {SITE.legalUpdated}
        </p>

        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: R.lg,
            boxShadow: SHADOW.e1,
            padding: S[6],
          }}
        >
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, marginTop: 0 }}>
            By using Nuqra you agree to use it lawfully for accepting restaurant
            payments. The service is provided as-is; this prototype demonstrates a
            scan-to-pay flow and is not a production payment processor.
          </p>

          <h2
            style={{
              ...T.h2,
              marginTop: S[6],
              marginBottom: S[3],
              paddingTop: S[6],
              borderTop: `1px solid ${C.border}`,
            }}
          >
            Accounts
          </h2>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, margin: 0 }}>
            Admin accounts are issued by the operator. You are responsible for
            keeping your credentials confidential.
          </p>

          <h2
            style={{
              ...T.h2,
              marginTop: S[6],
              marginBottom: S[3],
              paddingTop: S[6],
              borderTop: `1px solid ${C.border}`,
            }}
          >
            Contact
          </h2>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, margin: 0 }}>
            Questions? Call {SITE.salesPhone}.
          </p>
        </div>

        <p style={{ marginTop: S[6] }}>
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
