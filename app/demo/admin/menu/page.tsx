"use client";

// /demo/admin/menu: the menu as a page. Items grouped by category with price,
// description, and popular/spicy flags. Derived from MENU_CATEGORIES + MENU_ITEMS.

import type { CSSProperties } from "react";
import { C, S, T, MONO, STATUS, card } from "../../../lib/theme";
import { MENU_CATEGORIES, MENU_ITEMS } from "../../_data";
import { PageHead, useAdminDemo, tr, bi, fmtInt, type UIKey } from "../_shared";

export default function MenuPage() {
  const { locale } = useAdminDemo();
  const t = (k: UIKey) => tr(locale, k);

  return (
    <>
      <PageHead title={t("navMenu")} />

      <div style={{ display: "flex", flexDirection: "column", gap: S[6] }}>
        {MENU_CATEGORIES.map((cat) => {
          const items = MENU_ITEMS.filter((mi) => mi.categoryId === cat.id);
          if (items.length === 0) return null;
          return (
            <section key={cat.id}>
              <h2 style={{ ...T.h3, margin: `0 0 ${S[3]}px` }}>{bi(locale, cat.name)}</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: S[3] }}>
                {items.map((mi) => (
                  <div key={mi.id} style={{ ...card({ pad: S[4], radius: 14 }) }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: S[2] }}>
                      <div style={{ ...T.body, fontSize: 15, fontWeight: 600 }}>{bi(locale, mi.name)}</div>
                      <div style={{ ...MONO, fontWeight: 600, fontSize: 15, whiteSpace: "nowrap" }}>
                        {fmtInt(mi.priceSar)} <span style={{ ...T.caption, color: C.muted, fontFamily: "inherit", letterSpacing: 0 }}>SAR</span>
                      </div>
                    </div>
                    <p style={{ ...T.caption, color: C.muted, margin: `${S[1]}px 0 0`, lineHeight: 1.5 }}>
                      {bi(locale, mi.description)}
                    </p>
                    {(mi.popular || mi.spicy) ? (
                      <div style={{ display: "flex", gap: 6, marginTop: S[2] }}>
                        {mi.popular ? <span style={pill(C.brand, C.brandTint)}>{t("popularTag")}</span> : null}
                        {mi.spicy ? <span style={pill(STATUS.warn.fg, STATUS.warn.bg)}>{t("spicyTag")}</span> : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function pill(fg: string, bg: string): CSSProperties {
  return {
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: fg,
    background: bg,
    borderRadius: 999,
    padding: "2px 8px",
  };
}
