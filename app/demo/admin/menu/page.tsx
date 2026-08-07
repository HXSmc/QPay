"use client";

// /demo/admin/menu: the menu as a page. Items grouped by category with price,
// description, and popular/spicy flags. Both roles can edit an item's name +
// price inline via a small dialog; the change reflects in the rendered list.
// In-memory client state via the shell context.

import { useState, type CSSProperties } from "react";
import { C, S, T, MONO, R, STATUS, SHADOW, card, field, btn } from "../../../lib/theme";
import { MENU_CATEGORIES, type MenuItem } from "../../_data";
import { PageHead, useAdminDemo, tr, bi, fmtInt, LABEL_STYLE, type UIKey } from "../_shared";

export default function MenuPage() {
  const { locale, menuItems, setMenuItems } = useAdminDemo();
  const t = (k: UIKey) => tr(locale, k);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  return (
    <>
      <PageHead title={t("navMenu")} />

      <div style={{ display: "flex", flexDirection: "column", gap: S[6] }}>
        {MENU_CATEGORIES.map((cat) => {
          const items = menuItems.filter((mi) => mi.categoryId === cat.id);
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
                    <div style={{ display: "flex", gap: 6, marginTop: S[2], alignItems: "center", flexWrap: "wrap" }}>
                      {mi.popular ? <span style={pill(C.brand, C.brandTint)}>{t("popularTag")}</span> : null}
                      {mi.spicy ? <span style={pill(STATUS.warn.fg, STATUS.warn.bg)}>{t("spicyTag")}</span> : null}
                      <button
                        type="button"
                        className="qp-press"
                        aria-label={`${t("edit")} ${bi(locale, mi.name)}`}
                        onClick={() => setEditing(mi)}
                        style={{
                          ...T.caption,
                          marginInlineStart: "auto",
                          border: `1px solid ${C.border}`,
                          background: "transparent",
                          color: C.muted,
                          borderRadius: R.sm,
                          padding: "4px 10px",
                          cursor: "pointer",
                        }}
                      >
                        {t("edit")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {editing ? (
        <EditDialog
          locale={locale}
          item={editing}
          onCancel={() => setEditing(null)}
          onSave={(name, price) => {
            setMenuItems((prev) =>
              prev.map((mi) =>
                mi.id === editing.id
                  ? { ...mi, name: { ...mi.name, [locale]: name }, priceSar: price }
                  : mi,
              ),
            );
            setEditing(null);
            setFlash(t("itemSaved"));
            window.setTimeout(() => setFlash(null), 2500);
          }}
        />
      ) : null}

      {flash ? (
        <div
          role="status"
          style={{
            ...T.caption,
            color: STATUS.success.fg,
            background: STATUS.success.bg,
            border: `1px solid ${STATUS.success.border}`,
            borderRadius: R.sm,
            padding: `${S[2]}px ${S[3]}px`,
          }}
        >
          {flash}
        </div>
      ) : null}
    </>
  );
}

function EditDialog({
  locale,
  item,
  onCancel,
  onSave,
}: {
  locale: "ar" | "en";
  item: MenuItem;
  onCancel: () => void;
  onSave: (name: string, priceSar: number) => void;
}) {
  const t = (k: UIKey) => tr(locale, k);
  const [name, setName] = useState(bi(locale, item.name));
  const [price, setPrice] = useState(String(item.priceSar));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("editItem")}
      onClick={onCancel}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(23,21,15,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: S[4],
        zIndex: 50,
      }}
    >
      <div
        className="qp-modal-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          ...card({ pad: S[5], radius: R.lg }),
          width: "100%",
          maxWidth: 420,
          boxShadow: SHADOW.e3,
          display: "flex",
          flexDirection: "column",
          gap: S[3],
        }}
      >
        <h2 style={{ ...T.h3, margin: 0 }}>{t("editItem")}</h2>
        <div>
          <label style={LABEL_STYLE} htmlFor="qp-item-name">{t("itemName")}</label>
          <input id="qp-item-name" value={name} onChange={(e) => setName(e.target.value)} style={field()} autoFocus />
        </div>
        <div>
          <label style={LABEL_STYLE} htmlFor="qp-item-price">{t("itemPrice")}</label>
          <input
            id="qp-item-price"
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            style={{ ...field(), ...MONO }}
          />
        </div>
        <div style={{ display: "flex", gap: S[2], justifyContent: "flex-end" }}>
          <button type="button" className="qp-press" onClick={onCancel} style={btn("secondary", { size: "sm" })}>
            {t("cancel")}
          </button>
          <button
            type="button"
            className="qp-press"
            onClick={() => {
              const p = Math.max(0, Number(price) || 0);
              onSave(name.trim() || bi(locale, item.name), p);
            }}
            style={btn("primary", { size: "sm" })}
          >
            {t("save")}
          </button>
        </div>
      </div>
    </div>
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
