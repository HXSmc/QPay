import Link from "next/link";
import { C, R, S } from "../../lib/theme";
import { Wordmark } from "./Logo";

export function BrandHeader() {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        height: 60,
        padding: `0 ${S[5]}px`,
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <Link
        href="/"
        aria-label="QPay home"
        style={{
          display: "inline-flex",
          alignItems: "center",
          textDecoration: "none",
          color: C.text,
          borderRadius: R.sm,
        }}
      >
        <Wordmark />
      </Link>
    </div>
  );
}
