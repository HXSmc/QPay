import Link from "next/link";
import { BrandHeader } from "../components/site/BrandHeader";
import { SITE } from "../lib/site";
import { C, R, S, SHADOW, T } from "../lib/theme";
import { getServerLocale } from "../lib/i18n-server";
import { t } from "../lib/i18n";

export async function generateMetadata() {
  const locale = await getServerLocale();
  return locale === "ar"
    ? {
        title: "شروط الخدمة · نقرة",
        description: "الشروط التي تحكم استخدام منصة نقرة للدفع بمسح رمز QR في المطاعم.",
      }
    : {
        title: "Terms of service · Nuqra",
        description: "The terms that govern using Nuqra's scan-to-pay platform for restaurants.",
      };
}

export default async function TermsPage() {
  const locale = await getServerLocale();
  const h2Style = {
    ...T.h2,
    marginTop: S[6],
    marginBottom: S[3],
    paddingTop: S[6],
    borderTop: `1px solid ${C.border}`,
  } as const;
  const bodyStyle = {
    ...T.body,
    lineHeight: 1.7,
    color: C.muted,
    margin: 0,
  } as const;
  const leadBodyStyle = {
    ...T.body,
    lineHeight: 1.7,
    color: C.muted,
    marginTop: S[4],
  } as const;
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
          {t("Terms of service", locale)}
        </h1>
        <p
          style={{
            ...T.caption,
            color: C.muted,
            marginTop: S[3],
            marginBottom: S[6],
          }}
        >
          {SITE.company} · {t("last updated", locale)} {SITE.termsUpdated}
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
              "By using Nuqra you agree to use it lawfully for accepting restaurant payments. The service is provided as-is; this prototype demonstrates a scan-to-pay flow and is not a production payment processor.",
              locale,
            )}
          </p>

          <h2 style={h2Style}>{t("Who you are contracting with", locale)}</h2>
          <p style={bodyStyle}>
            {t(
              "Nuqra is operated by Taweed Establishment, a Saudi establishment with Commercial Registration 7054836007. In these terms, \"we\" and \"us\" mean Taweed Establishment, and \"you\" means the restaurant business that holds a Nuqra account, together with anyone using the account on its behalf.",
              locale,
            )}
          </p>
          <p style={leadBodyStyle}>
            {t("Postal address: EDDA2367, Al Hussam District, Dammam 34223, Saudi Arabia.", locale)}
          </p>
          <p style={leadBodyStyle}>
            {t(
              "Diners who scan a table QR code are not parties to these terms. Their relationship for the meal itself is with the restaurant.",
              locale,
            )}
          </p>

          <h2 style={h2Style}>{t("Accounts", locale)}</h2>
          <p style={bodyStyle}>
            {t(
              "Admin accounts are issued by the operator. You are responsible for keeping your credentials confidential.",
              locale,
            )}
          </p>

          <h2 style={h2Style}>{t("Your right to use Nuqra", locale)}</h2>
          <p style={bodyStyle}>
            {t(
              "For as long as your account is active, we grant you a limited, non-exclusive, non-transferable, non-sublicensable and revocable right to use Nuqra to run scan-to-pay ordering at the branches and tables covered by your plan. That is a right to use the service, not a sale of it.",
              locale,
            )}
          </p>
          <p style={leadBodyStyle}>
            {t(
              "Nuqra runs in a browser. We do not deliver any software for you to install or keep, and nothing here gives you rights in our code.",
              locale,
            )}
          </p>
          <p style={leadBodyStyle}>
            {t(
              "You may not resell, sublicense or white label access to Nuqra, share admin credentials outside your business, or use Nuqra to provide a service to other restaurants.",
              locale,
            )}
          </p>

          <h2 style={h2Style}>{t("What we own", locale)}</h2>
          <p style={bodyStyle}>
            {t(
              "Taweed Establishment owns Nuqra and everything that makes it work: the software, the admin dashboard, the diner interface and its design, the QR ordering flow, the Nuqra name and the Nuqra logo. Nothing in these terms transfers any of that to you.",
              locale,
            )}
          </p>
          <p style={leadBodyStyle}>
            {t(
              "Your restaurant's own name, logo, menu text, photographs and brand stay yours. Nothing in these terms transfers any of that to us.",
              locale,
            )}
          </p>

          <h2 style={h2Style}>{t("The menus and images you upload", locale)}</h2>
          <p style={bodyStyle}>
            {t("You upload menu files and images to Nuqra. Two things follow from that.", locale)}
          </p>
          <p style={leadBodyStyle}>
            <strong>{t("They are published.", locale)}</strong>
            {t(
              " Menu files you upload are stored so that a diner who scans your table QR code can open them. They are served from a public address, which means anyone who has the link can open them, not only diners sitting in your restaurant. Do not upload anything to Nuqra that you would not be willing to see published.",
              locale,
            )}
          </p>
          <p style={leadBodyStyle}>
            <strong>{t("You promise you have the rights.", locale)}</strong>
            {t(
              " You confirm that you own, or are properly licensed to use, everything you upload, including dish photographs, logos, fonts and any third-party artwork. Stock and agency photography is a common source of problems here: a licence to print a photo on a paper menu very often does not cover publishing it online. Check your licence before uploading.",
              locale,
            )}
          </p>
          <p style={leadBodyStyle}>
            <strong>{t("The licence you give us.", locale)}</strong>
            {t(
              " By uploading, you grant us a non-exclusive, worldwide, royalty free licence to store, reproduce, adapt for display, and publish your uploaded files, and to make them available to diners, for the sole purpose of running Nuqra for you. The licence covers hosting with our storage provider. It ends when you delete the file or your account, except for copies already cached or held in routine backups until those cycle out.",
              locale,
            )}
          </p>
          <p style={leadBodyStyle}>
            <strong>{t("You cover us if that promise is wrong.", locale)}</strong>
            {t(
              " If a third party brings a claim against us because material you uploaded infringed their rights, you will cover our reasonable costs and any amount we have to pay, provided we tell you about the claim promptly and let you take part in handling it.",
              locale,
            )}
          </p>
          <p style={leadBodyStyle}>
            {t("How claims are notified and handled is set out under Indemnity below.", locale)}
          </p>
          <p style={leadBodyStyle}>
            {t("If you believe material on Nuqra infringes your copyright, see our ", locale)}
            <Link href="/copyright" style={{ color: C.brand, textDecoration: "underline" }}>
              {t("Copyright and takedown", locale)}
            </Link>
            {t(" page.", locale)}
          </p>

          <h2 style={h2Style}>{t("Acceptable use", locale)}</h2>
          <p style={bodyStyle}>
            {t("Use Nuqra lawfully and for its intended purpose. Do not:", locale)}
          </p>
          <ul
            style={{
              ...T.body,
              color: C.muted,
              lineHeight: 1.7,
              paddingInlineStart: S[5],
              margin: `${S[3]}px 0 0`,
            }}
          >
            <li style={{ marginBottom: S[2] }}>
              {t(
                "upload unlawful material, material you do not have the rights to, or images that show identifiable people without their permission;",
                locale,
              )}
            </li>
            <li style={{ marginBottom: S[2] }}>
              {t(
                "misdescribe food, prices or allergens, that is your legal responsibility as the restaurant and we do not check it;",
                locale,
              )}
            </li>
            <li style={{ marginBottom: S[2] }}>
              {t(
                "copy, reverse engineer, decompile or disassemble any part of Nuqra, or try to extract its source code;",
                locale,
              )}
            </li>
            <li style={{ marginBottom: S[2] }}>
              {t(
                "scrape Nuqra, or access it with bots or automated tools rather than a normal browser;",
                locale,
              )}
            </li>
            <li style={{ marginBottom: S[2] }}>
              {t("use Nuqra to build a competing product;", locale)}
            </li>
            <li style={{ marginBottom: S[2] }}>
              {t(
                "share admin credentials outside your business, or let a third party operate your account;",
                locale,
              )}
            </li>
            <li style={{ marginBottom: S[2] }}>
              {t(
                "interfere with the service, probe it for vulnerabilities, or do anything that puts its security or availability at risk;",
                locale,
              )}
            </li>
            <li>
              {t(
                "exceed the table or branch limits of your plan by creating additional accounts.",
                locale,
              )}
            </li>
          </ul>
          <p style={leadBodyStyle}>
            {t("We may suspend or terminate an account that breaks these rules.", locale)}
          </p>

          <h2 style={h2Style}>{t("Indemnity", locale)}</h2>
          <p style={bodyStyle}>
            {t(
              "You will defend us against, and cover us for, any claim, demand, action, fine or proceeding brought or imposed against us by a third party, and any resulting loss, damages, fines, and reasonable costs and legal fees, to the extent it arises out of: (a) your breach of these terms; (b) your use of Nuqra unlawfully or otherwise than as these terms allow; (c) material you upload, as set out above; or (d) a claim by a diner, a supplier, an employee or a regulator relating to your menu content, your prices, your allergen or ingredient information, food safety, or the meal itself.",
              locale,
            )}
          </p>
          <p style={leadBodyStyle}>
            {t(
              "For your indemnity to apply we will tell you about the claim without undue delay and let you take part in handling it at your own cost. We keep sole conduct of the defence and of any settlement of a claim brought against us, and you may not settle a claim, or admit liability on our behalf, without our written agreement.",
              locale,
            )}
          </p>

          <h2 style={h2Style}>{t("Copyright complaints", locale)}</h2>
          <p style={bodyStyle}>
            {t("If you believe material on Nuqra infringes your copyright, our ", locale)}
            <Link href="/copyright" style={{ color: C.brand, textDecoration: "underline" }}>
              {t("Copyright and takedown", locale)}
            </Link>
            {t(
              " page explains what to include in a notice, where to send it, what we do with it, how to respond if your file was removed by mistake, and when we terminate accounts for repeat infringement. We remove infringing material within a reasonable time of being notified.",
              locale,
            )}
          </p>

          <h2 style={h2Style}>{t("Service availability and no warranty", locale)}</h2>
          <p style={bodyStyle}>
            {t(
              "We work to keep Nuqra available, but we do not promise that it will be uninterrupted or error free, that it will be free of defects, or that it will be fit for any particular purpose. To the fullest extent the law allows, the service is provided as is and as available, and we exclude all warranties and conditions that are not expressly set out in these terms.",
              locale,
            )}
          </p>
          <p style={leadBodyStyle}>
            {t(
              "Nuqra depends on your internet connection and on third-party infrastructure. We are not responsible for an outage caused by something outside our control.",
              locale,
            )}
          </p>
          <p style={leadBodyStyle}>
            {t(
              "Nuqra is a tool for taking and displaying orders. It is not a point of sale system of record, not an accounting system, and not a substitute for your own records. Keep your own.",
              locale,
            )}
          </p>

          <h2 style={h2Style}>{t("Limitation of liability", locale)}</h2>
          <p style={bodyStyle}>
            {t(
              "Nothing in these terms limits liability that cannot be limited by law, including liability for fraud, for death or personal injury caused by negligence, or for anything a Saudi court will not permit to be excluded.",
              locale,
            )}
          </p>
          <p style={leadBodyStyle}>
            {t(
              "Subject to that, to the fullest extent permitted by law we are not liable for lost profits, lost revenue, lost sales, lost or corrupted data, business interruption, or any indirect or consequential loss, arising from your use of Nuqra, however it arises.",
              locale,
            )}
          </p>
          <p style={leadBodyStyle}>
            {t(
              "Subject always to the paragraph above on liability that cannot be limited by law, our total liability to you for all claims arising out of or in connection with these terms and your use of Nuqra, taken together in any twelve month period, will not exceed the total fees you paid us for Nuqra in the twelve months before the event giving rise to the claim. If you use Nuqra on a free, trial or pilot basis, or if no fees were payable in that period, our total liability will not exceed one thousand Saudi riyals (SAR 1,000).",
              locale,
            )}
          </p>
          <p style={leadBodyStyle}>
            {t(
              "This limit applies to our contractual liability under these terms. It does not purport to limit any liability that Saudi law does not allow to be limited by agreement, and it does not apply to liability for a harmful act.",
              locale,
            )}
          </p>
          <h2 style={h2Style}>{t("Suspension and termination", locale)}</h2>
          <p style={bodyStyle}>
            {t("You may close your account at any time by contacting us.", locale)}
          </p>
          <p style={leadBodyStyle}>
            {t(
              "We may suspend or terminate an account that breaks these terms, that is used unlawfully, or that creates a security or legal risk to us or to other customers. Where it is reasonable we will warn you first, but we do not have to where the problem is serious.",
              locale,
            )}
          </p>
          <p style={leadBodyStyle}>
            {t(
              "When an account closes, your stored menu files are deleted and your QR codes stop working. Export anything you need first. We may keep records we are required to keep by law, as described in our ",
              locale,
            )}
            <Link href="/privacy" style={{ color: C.brand, textDecoration: "underline" }}>
              {t("Privacy policy", locale)}
            </Link>
            .
          </p>
          <p style={leadBodyStyle}>
            {t(
              "Either of us may end this agreement for convenience by giving the other thirty (30) days notice in writing. If we end it for convenience, we will refund any fees you have paid in advance for the period after termination. Ending the agreement does not refund fees for a period you have already used.",
              locale,
            )}
          </p>
          <p style={leadBodyStyle}>
            {t(
              "If fees become payable for your plan and an invoice is not paid by its due date, we may suspend your account after giving you notice and a reasonable opportunity to pay, and we may terminate it if the invoice remains unpaid thirty (30) days after that notice. Suspension for non-payment does not reduce what you already owe.",
              locale,
            )}
          </p>
          <p style={leadBodyStyle}>
            {t(
              "Ending this agreement, however it ends, does not affect the sections on what we own, the menus and images you upload (including the licence you give us), service availability and no warranty, limitation of liability, indemnity, and governing law and disputes. Those sections continue to apply after your account closes, together with any right or liability that had already arisen.",
              locale,
            )}
          </p>

          <h2 style={h2Style}>{t("Governing law and disputes", locale)}</h2>
          <p style={bodyStyle}>
            {t(
              "These terms are governed by the laws of the Kingdom of Saudi Arabia. If a dispute arises, please contact us first so we can try to resolve it directly. If we cannot, the competent courts of the Kingdom of Saudi Arabia have jurisdiction.",
              locale,
            )}
          </p>
          <p style={leadBodyStyle}>
            {t(
              "These terms are published in Arabic and in English. If there is any difference between the two versions, the Arabic version prevails.",
              locale,
            )}
          </p>

          <h2 style={h2Style}>{t("Changes to these terms", locale)}</h2>
          <p style={bodyStyle}>
            {t(
              "We may update these terms. When we make a material change we will post it here with an updated date at the top, and continued use of Nuqra after that counts as acceptance.",
              locale,
            )}
          </p>

          <h2 style={h2Style}>{t("Contact", locale)}</h2>
          <p style={bodyStyle}>
            {t("Questions? Call", locale)} {SITE.salesPhone}.{" "}
            {t("Postal address: EDDA2367, Al Hussam District, Dammam 34223, Saudi Arabia.", locale)}
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
