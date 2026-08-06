import Link from "next/link";
import { BrandHeader } from "../components/site/BrandHeader";
import { SITE } from "../lib/site";
import { C, MONO, R, S, SHADOW, T } from "../lib/theme";
import { getServerLocale } from "../lib/i18n-server";
import { t } from "../lib/i18n";

export async function generateMetadata() {
  const locale = await getServerLocale();
  return locale === "ar"
    ? {
        title: "حقوق المؤلف وإزالة المحتوى المخالف · نقرة",
        description:
          "كيف تبلّغ عن مادة تنتهك حقوق المؤلف على نقرة، وماذا نفعل بالإخطار، وكيف تردّ إن أُزيل ملفك.",
      }
    : {
        title: "Copyright and takedown · Nuqra",
        description:
          "How to report copyright-infringing material on Nuqra, what we do with a notice, and how to respond if your file was removed.",
      };
}

export default async function CopyrightPage() {
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
          {t("Copyright and takedown", locale)}
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
              "Nuqra lets restaurant operators upload menu files and images, which are then shown to diners who scan a table QR code. Those files are served publicly. That means a menu image an operator uploads can be seen by anyone who has the link.",
              locale,
            )}
          </p>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, marginTop: S[4] }}>
            {t(
              "If you own a copyright and you believe a menu file, photograph, logo or other material on Nuqra infringes it, this page tells you how to report it, what we will do, and what the operator who uploaded it can do in response.",
              locale,
            )}
          </p>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, marginTop: S[4] }}>
            {t("This page applies alongside our ", locale)}
            <Link href="/terms" style={{ color: C.brand, textDecoration: "underline" }}>
              {t("Terms of service", locale)}
            </Link>
            {t(" and our ", locale)}
            <Link href="/privacy" style={{ color: C.brand, textDecoration: "underline" }}>
              {t("Privacy policy", locale)}
            </Link>
            .
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
            {t("Sending us a notice", locale)}
          </h2>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, margin: 0 }}>
            {t("Send your notice by email to ", locale)}
            <code
              style={{
                fontFamily: MONO.fontFamily,
                background: C.canvas,
                border: `1px solid ${C.border}`,
                borderRadius: R.sm,
                padding: "1px 5px",
              }}
            >
              {SITE.copyrightEmail}
            </code>
            {"."}
          </p>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, marginTop: S[4] }}>
            {t(
              "Include all of the following, so we can find the material and understand the claim:",
              locale,
            )}
          </p>
          <ol
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
                "Your name and email address, and a postal address and telephone number if you have them.",
                locale,
              )}
            </li>
            <li style={{ marginBottom: S[2] }}>
              {t(
                "Identification of the copyrighted work you say has been infringed. A representative list is enough if several works are involved.",
                locale,
              )}
            </li>
            <li style={{ marginBottom: S[2] }}>
              {t(
                "The exact location of the material on Nuqra. For a menu file this is normally the public file URL. Tell us the restaurant name and branch as well, so we can find it if the link changes.",
                locale,
              )}
            </li>
            <li style={{ marginBottom: S[2] }}>
              {t(
                "A substantiated explanation of why you believe the material infringes your copyright.",
                locale,
              )}
            </li>
            <li style={{ marginBottom: S[2] }}>
              {t(
                "A statement that you have a good faith belief that the use complained of is not authorised by you, by your agent, or by law.",
                locale,
              )}
            </li>
            <li style={{ marginBottom: S[2] }}>
              {t(
                "A statement that the information in your notice is accurate and complete, and that you are the copyright owner or are authorised to act on the owner's behalf.",
                locale,
              )}
            </li>
            <li>
              {t("Your signature, written or electronic.", locale)}
            </li>
          </ol>

          <h2
            style={{
              ...T.h2,
              marginTop: S[6],
              marginBottom: S[3],
              paddingTop: S[6],
              borderTop: `1px solid ${C.border}`,
            }}
          >
            {t("What we do when we receive a notice", locale)}
          </h2>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, margin: 0 }}>
            {t("We confirm receipt without undue delay.", locale)}
          </p>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, marginTop: S[4] }}>
            {t(
              "We review the notice. If it appears valid, we remove the file or disable access to it within a reasonable time, and we notify the restaurant operator who uploaded it, giving them a copy of your notice so that they can respond. If you do not want your contact details passed on, say so in your notice and we will tell you before we act.",
              locale,
            )}
          </p>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, marginTop: S[4] }}>
            {t(
              "We then tell you what we decided and why, and how you can challenge that decision.",
              locale,
            )}
          </p>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, marginTop: S[4] }}>
            {t(
              "If a notice is incomplete, we will tell you what is missing rather than ignoring it.",
              locale,
            )}
          </p>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, marginTop: S[4] }}>
            {t(
              "We do not review uploaded menus for infringing content before they are published, and nothing here obliges us to.",
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
            {t("If your file was removed and you believe that was a mistake", locale)}
          </h2>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, margin: 0 }}>
            {t(
              "If we removed a file you uploaded and you believe it was removed by mistake or misidentified, send us a counter notification at the same address, containing:",
              locale,
            )}
          </p>
          <ol
            style={{
              ...T.body,
              color: C.muted,
              lineHeight: 1.7,
              paddingInlineStart: S[5],
              margin: `${S[3]}px 0 0`,
            }}
          >
            <li style={{ marginBottom: S[2] }}>
              {t("Your signature, written or electronic.", locale)}
            </li>
            <li style={{ marginBottom: S[2] }}>
              {t(
                "Identification of the file that was removed and where it appeared before removal.",
                locale,
              )}
            </li>
            <li style={{ marginBottom: S[2] }}>
              {t(
                "A statement that you have a good faith belief the file was removed as a result of mistake or misidentification, together with a brief explanation of the right you rely on, for example the licence or the photographer's release.",
                locale,
              )}
            </li>
            <li style={{ marginBottom: S[2] }}>
              {t(
                "Your name, the restaurant and branch, your postal address and your telephone number.",
                locale,
              )}
            </li>
            <li>
              {t(
                "Confirmation that you accept that the person who sent the original notice may pursue the matter before the competent authority, and that you will accept notice of any such proceedings at the address you have given.",
                locale,
              )}
            </li>
          </ol>

          <h2
            style={{
              ...T.h2,
              marginTop: S[6],
              marginBottom: S[3],
              paddingTop: S[6],
              borderTop: `1px solid ${C.border}`,
            }}
          >
            {t("What happens after a counter notification", locale)}
          </h2>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, margin: 0 }}>
            {t(
              "We forward your counter notification to the person who sent the original notice and tell them we will restore the file in 10 business days.",
              locale,
            )}
          </p>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, marginTop: S[4] }}>
            {t(
              "Unless that person tells us within 10 business days that they have begun proceedings before a court or before the Saudi Authority for Intellectual Property to stop the use complained of, we restore the file, or stop disabling access to it, not less than 10 and not more than 14 business days after we receive your counter notification.",
              locale,
            )}
          </p>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, marginTop: S[4] }}>
            {t(
              "These periods are our own commitment. Saudi law does not currently fix a statutory put back timetable, so we have adopted the timetable used under United States law as a fair and predictable default for both sides.",
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
            {t("Repeat infringers", locale)}
          </h2>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, margin: 0 }}>
            {t(
              "We suspend and then terminate the accounts of restaurant operators who repeatedly upload material that infringes copyright.",
              locale,
            )}
          </p>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, marginTop: S[4] }}>
            {t(
              "In practice: each notice that leads us to remove a file is recorded against the operator account that uploaded it. A first valid notice results in removal and a written warning. A second results in removal and suspension of upload rights pending a conversation with the operator. A third results in termination of the account and deletion of its stored files. A notice that is withdrawn, or that is answered by a counter notification we receive no proceedings against, does not count. We may terminate immediately, without waiting for a pattern, where the circumstances plainly warrant it.",
              locale,
            )}
          </p>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, marginTop: S[4] }}>
            {t(
              "Termination under this policy does not entitle the operator to a refund of any fees already paid, and does not affect any claim a rights holder may have against the operator directly.",
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
            {t("False or abusive notices", locale)}
          </h2>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, margin: 0 }}>
            {t(
              "Sending a notice or a counter notification is a serious step, and a person who knowingly makes a false statement in one may be liable to anyone injured by it. We may decline to act on notices from a sender who has repeatedly sent notices in bad faith.",
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
            {t("Saudi law", locale)}
          </h2>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, margin: 0 }}>
            {t(
              "Nuqra is operated from Saudi Arabia and serves restaurants and diners in Saudi Arabia. The Saudi Copyright Law issued by Royal Decree No. M/169, published on 13 February 2026 and in force from 12 August 2026, addresses the position of online content providers at Article 49. Among the conditions for the exemption it provides are that the provider handles content in a purely technical and automatic way, removes infringing content within a reasonable time once notified, and gives rights holders a way to notify it. This page is that mechanism.",
              locale,
            )}
          </p>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, marginTop: S[4] }}>
            {t(
              "You may also file a copyright infringement complaint directly with the Saudi Authority for Intellectual Property (SAIP) through its published complaint service.",
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
            {t("Notices from outside Saudi Arabia", locale)}
          </h2>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, margin: 0 }}>
            {t(
              "We accept notices from rights holders anywhere. Where the material is being served to users outside Saudi Arabia and the sender relies on the law of another country, tell us which law you are relying on and we will take it into account.",
              locale,
            )}
          </p>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, marginTop: S[4] }}>
            {t(
              "No United States designated agent is currently registered for Nuqra. Copyright notices should be sent by email to ",
              locale,
            )}
            <code
              style={{
                fontFamily: MONO.fontFamily,
                background: C.canvas,
                border: `1px solid ${C.border}`,
                borderRadius: R.sm,
                padding: "1px 5px",
              }}
            >
              {SITE.copyrightEmail}
            </code>
            {"."}
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
            {t("Changes to this page", locale)}
          </h2>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, margin: 0 }}>
            {t(
              "We may update this page. When we make a material change we will post it here with an updated date at the top.",
              locale,
            )}
          </p>
          <p style={{ ...T.body, lineHeight: 1.7, color: C.muted, marginTop: S[4] }}>
            {t("Questions? Email ", locale)}
            <code
              style={{
                fontFamily: MONO.fontFamily,
                background: C.canvas,
                border: `1px solid ${C.border}`,
                borderRadius: R.sm,
                padding: "1px 5px",
              }}
            >
              {SITE.copyrightEmail}
            </code>
            {t(" or call +966566201233.", locale)}
            {" "}
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
