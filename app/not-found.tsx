import Link from "next/link";
import { BrandHeader } from "./components/site/BrandHeader";
import { LogoMark } from "./components/site/Logo";
import { C, S, T, btn } from "./lib/theme";

export const metadata = { title: "Page not found · Nuqra" };

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", background: C.surface, color: C.text }}>
      <BrandHeader />
      <div
        style={{
          minHeight: "calc(100vh - 60px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: `${S[7]}px ${S[5]}px`,
        }}
      >
        <LogoMark size={56} radius={16} />
        <p
          style={{
            ...T.label,
            color: C.faint,
            letterSpacing: "0.08em",
            marginTop: S[5],
            marginBottom: S[2],
          }}
        >
          404
        </p>
        <h1 style={{ ...T.h1, margin: 0 }}>Page not found</h1>
        <p
          style={{
            ...T.body,
            lineHeight: 1.7,
            color: C.muted,
            maxWidth: 420,
            marginTop: S[3],
            marginBottom: S[6],
          }}
        >
          The page you are looking for may have moved or no longer exists. Let us
          get you back on track.
        </p>
        <Link href="/" style={{ ...btn("primary", { size: "lg" }), textDecoration: "none" }}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
