"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { C, R, S, T } from "../../lib/theme";
import { Wordmark } from "./Logo";

// Seamless sticky navbar: it sits transparent over the page at the top and,
// only once the page scrolls, melts into a soft blurred surface (no hard 1px
// border, no boxed bar). The logo/text color stays constant the whole time.
export function BrandHeader() {
  const [scrolled, setScrolled] = useState(false);

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
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: S[4],
        height: 64,
        padding: `0 ${S[5]}px`,
        // Transparent at rest, gentle blurred surface once scrolled. No border.
        background: scrolled ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0)",
        backdropFilter: scrolled ? "saturate(180%) blur(12px)" : "none",
        WebkitBackdropFilter: scrolled ? "saturate(180%) blur(12px)" : "none",
        boxShadow: scrolled
          ? "0 6px 24px rgba(20,23,27,0.06)"
          : "0 0 0 rgba(20,23,27,0)",
        transition:
          "background 280ms cubic-bezier(0.16,1,0.3,1), box-shadow 280ms cubic-bezier(0.16,1,0.3,1)",
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
        <Link
          href="/admin/login"
          className="qp-nav"
          style={{
            ...T.label,
            display: "inline-flex",
            alignItems: "center",
            padding: `${S[2]}px ${S[3]}px`,
            textDecoration: "none",
            color: C.muted,
            borderRadius: R.md,
          }}
        >
          Sign in
        </Link>
      </nav>
    </header>
  );
}
