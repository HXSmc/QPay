"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { C, R, S, SHADOW, T, btn } from "../../lib/theme";
import { Wordmark } from "./Logo";
import { LanguageToggle } from "./LanguageToggle";
import { useT } from "../../lib/i18n-client";

// Floating rounded navbar (Moyasar-style): a self-contained, capsule-shaped bar
// that hovers inset from the top of the page on its own translucent surface with
// a hairline border and soft shadow. It tightens (more opaque, deeper shadow)
// once the page scrolls. The full-width <header> is just a transparent,
// pointer-through positioning shell; the visible pill is the inner container.
export function BrandHeader() {
  const [scrolled, setScrolled] = useState(false);
  const tr = useT();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        padding: `${S[3]}px ${S[4]}px`,
        pointerEvents: "none", // shell ignores clicks; the pill re-enables them
      }}
    >
      <div
        className="qp-nav-pill"
        style={{
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: S[4],
          maxWidth: 1080,
          margin: "0 auto",
          height: 60,
          // Logical padding so the wider logo-side gap follows the writing
          // direction (flips correctly under RTL).
          paddingBlock: 0,
          paddingInline: `${S[5]}px ${S[3]}px`,
          borderRadius: R.pill,
          border: `1px solid ${scrolled ? C.border : "rgba(229,232,236,0.7)"}`,
          background: scrolled ? "rgba(255,255,255,0.86)" : "rgba(255,255,255,0.62)",
          backdropFilter: "saturate(180%) blur(14px)",
          WebkitBackdropFilter: "saturate(180%) blur(14px)",
          boxShadow: scrolled ? SHADOW.e2 : SHADOW.e1,
          transition:
            "background 280ms cubic-bezier(0.16,1,0.3,1), box-shadow 280ms cubic-bezier(0.16,1,0.3,1), border-color 280ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <Link
          href="/"
          aria-label="Nuqra home"
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

        <nav
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: S[2],
          }}
        >
          <LanguageToggle />
          <Link
            href="/admin/login"
            className="qp-nav qp-hide-mobile"
            style={{
              ...T.label,
              display: "inline-flex",
              alignItems: "center",
              padding: `${S[2]}px ${S[3]}px`,
              textDecoration: "none",
              color: C.muted,
              borderRadius: R.pill,
            }}
          >
            {tr("Sign in")}
          </Link>
          <Link
            href="/demo"
            className="qp-cta"
            style={{
              ...btn("primary", { size: "sm" }),
              borderRadius: R.pill,
              textDecoration: "none",
            }}
          >
            {tr("Start free trial")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
