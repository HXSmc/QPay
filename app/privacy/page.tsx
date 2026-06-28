import Link from "next/link";
import { BrandHeader } from "../components/site/BrandHeader";
import { SITE } from "../lib/site";
import { C, R, S, SHADOW, T } from "../lib/theme";
import { getServerLocale } from "../lib/i18n-server";
import { t } from "../lib/i18n";

export const metadata = { title: "Privacy policy · Nuqra" };

export default async function PrivacyPage() {
  const locale = await getServerLocale();
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
          {t("Legal", locale)}
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
          {t("Privacy policy", locale)}
        </h1>
        <p
          style={{
            ...T.caption,
            color: C.muted,
            marginTop: S[3],
            marginBottom: S[6],
          }}
        >
          {SITE.company} · {t("last updated", locale)} {SITE.legalUpdated}
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
            {t(
              "Nuqra processes the minimum data needed to run scan-to-pay: table and order details, payment records, and (for demo requests) the name, email, and restaurant you submit. We do not sell personal data.",
              locale,
            )}
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
            {t("What we collect", locale)}
          </h2>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, margin: 0 }}>
            {t(
              "Account credentials (stored only as salted hashes), restaurant settings, live table/order state, payment ledger entries, and demo-request leads.",
              locale,
            )}
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
            {t("Contact", locale)}
          </h2>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, margin: 0 }}>
            {t("For privacy or data requests, email", locale)} {SITE.privacyEmail} (
            {t("or call", locale)}{" "}
            {SITE.salesPhone}).
          </p>
        </div>

        <p style={{ marginTop: S[6] }}>
          <Link
            href="/"
            style={{ ...T.label, color: C.brand, textDecoration: "none" }}
          >
            {locale === "ar" ? "→" : "←"} {t("Back to home", locale)}
          </Link>
        </p>
      </article>
    </div>
  );
}
