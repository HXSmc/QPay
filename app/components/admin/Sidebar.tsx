"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getMe, getSettings, logout, type Me } from "../../lib/api";
import { LogoMark } from "../site/Logo";
import { LanguageToggle } from "../site/LanguageToggle";
import { C, R, S, SHADOW, T } from "../../lib/theme";
import { useT } from "../../lib/i18n-client";

const NAV = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
  },
  {
    href: "/admin/tables",
    label: "Tables & QR",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="5" height="5" x="3" y="3" rx="1" />
        <rect width="5" height="5" x="16" y="3" rx="1" />
        <rect width="5" height="5" x="3" y="16" rx="1" />
        <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
        <path d="M21 21v.01" />
        <path d="M12 7v3a2 2 0 0 1-2 2H7" />
        <path d="M3 12h.01" />
        <path d="M12 3h.01" />
        <path d="M12 16v.01" />
        <path d="M16 12h1" />
        <path d="M21 12v.01" />
        <path d="M12 21v-1" />
      </svg>
    ),
  },
  {
    href: "/admin/branches",
    label: "Branches",
    multiBranchOnly: true,
    managerOnly: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" />
        <path d="M5 21V7l8-4v18" />
        <path d="M19 21V11l-6-4" />
        <path d="M9 9v.01" />
        <path d="M9 12v.01" />
        <path d="M9 15v.01" />
        <path d="M9 18v.01" />
      </svg>
    ),
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    href: "/admin/transactions",
    label: "Transactions",
    managerOnly: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
      </svg>
    ),
  },
  {
    href: "/admin/menu",
    label: "Menu",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11h18" />
        <path d="M12 3v18" />
        <rect width="18" height="18" x="3" y="3" rx="2" />
      </svg>
    ),
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    href: "/admin/team",
    label: "Team",
    managerOnly: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/admin/contact",
    label: "Contact",
    managerOnly: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2Z" />
        <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
      </svg>
    ),
  },
  {
    href: "/admin/settings",
    label: "Settings",
    managerOnly: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const tr = useT();
  const [me, setMe] = useState<Me | null>(null);
  const [multiBranch, setMultiBranch] = useState(false);
  const isBranchAdmin = me?.role === "admin";

  useEffect(() => {
    getMe().then(setMe).catch(() => {});
    // The Branches section only appears for multi-branch managers.
    getSettings()
      .then((s) => setMultiBranch((s.branches ?? 1) > 1))
      .catch(() => {});
  }, []);

  const initials = (me?.email ?? "")
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase() || "QP";

  const signOut = async () => {
    await logout();
    router.push("/");
    router.refresh();
  };

  return (
    <div
      className="qp-sidebar"
      style={{
        width: 244,
        flexShrink: 0,
        background: C.ink,
        color: "#fff",
        padding: `${S[5]}px ${S[3]}px ${S[4]}px`,
        display: "flex",
        flexDirection: "column",
        gap: S[2],
        minHeight: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      {/* Brand */}
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: S[2] + 2,
          padding: `0 ${S[2]}px ${S[4]}px`,
          textDecoration: "none",
          color: "#fff",
        }}
      >
        <LogoMark size={30} onDark decorative />
        <span style={{ ...T.h2, fontWeight: 700 }}>Nuqra</span>
      </Link>

      {/* Section label */}
      <div
        className="qp-hide-mobile"
        style={{
          ...T.caption,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: C.faint,
          padding: `0 ${S[3]}px ${S[1]}px`,
        }}
      >
        {tr("Manage")}
      </div>

      {/* Primary navigation */}
      <nav
        aria-label="Admin"
        style={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        {NAV.filter((item) => {
          // Branch-admins get a reduced nav (no chain-level sections).
          if (isBranchAdmin && "managerOnly" in item) return false;
          // The Branches section only shows for multi-branch managers.
          if ("multiBranchOnly" in item && !multiBranch) return false;
          return true;
        }).map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={active ? undefined : "qp-nav"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: S[3] - 1,
                padding: `${S[2] + 1}px ${S[3]}px`,
                borderRadius: R.md,
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                textDecoration: "none",
                background: active ? C.brand : "transparent",
                color: active ? "#fff" : C.faint,
                boxShadow: active ? SHADOW.cta : undefined,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex",
                  opacity: active ? 1 : 0.9,
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </span>
              {tr(item.label)}
            </Link>
          );
        })}
      </nav>

      {/* Account */}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          gap: S[2] + 2,
          padding: `${S[3]}px ${S[2]}px 0`,
          borderTop: `1px solid ${C.inkSoft}`,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: R.pill,
            background: C.brand,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div className="qp-hide-mobile" style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: "#fff",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {me?.email ?? "..."}
          </div>
          <div style={{ ...T.caption, color: C.faint }}>
            {me?.role === "super"
              ? tr("Super Admin")
              : me?.role === "manager"
                ? tr("Manager")
                : me?.branchName
                  ? `${tr("Branch admin")} · ${me.branchName}`
                  : tr("Branch admin")}
          </div>
        </div>
        <LanguageToggle onDark />
        <button
          onClick={signOut}
          title={tr("Sign out")}
          aria-label={tr("Sign out")}
          className="qp-press"
          style={{
            border: "none",
            background: C.inkSoft,
            color: C.faint,
            borderRadius: R.sm,
            width: 32,
            height: 32,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
