"use client";

// /demo/admin/team: the team panel promoted to a page. Every staff member
// grouped by branch (group-wide, branchId = "all"), plus a role-count summary.
// Both roles can add a member (name + role) and remove one; the list updates.
// In-memory client state via the shell context.

import { useState } from "react";
import { C, S, T, MONO, R, STATUS, card, field, btn } from "../../../lib/theme";
import { type StaffMember } from "../../_data";
import { TeamPanel, PageHead, useAdminDemo, tr, ROLE_LABEL, LABEL_STYLE, type UIKey } from "../_shared";

const ROLE_ORDER: StaffMember["role"][] = ["owner", "branch_manager", "server", "cashier"];
// Roles a demo user can assign to a new member (owner is group-level, not assignable here).
const ADDABLE_ROLES: StaffMember["role"][] = ["branch_manager", "server", "cashier"];

export default function TeamPage() {
  const { locale, staff, setStaff } = useAdminDemo();
  const t = (k: UIKey) => tr(locale, k);
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffMember["role"]>("server");
  const [flash, setFlash] = useState<string | null>(null);

  const roleCounts = ROLE_ORDER.map((r) => ({
    role: r,
    label: t(ROLE_LABEL[r]),
    count: staff.filter((s) => s.role === r).length,
  })).filter((r) => r.count > 0);

  const addMember = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const m: StaffMember = {
      id: `stf_${Date.now()}`,
      name: { en: trimmed, ar: trimmed },
      role,
      branchId: "br_dhahran",
      status: "active",
    };
    setStaff((prev) => [...prev, m]);
    setName("");
    setFlash(t("memberAdded"));
    window.setTimeout(() => setFlash(null), 2500);
  };

  const removeMember = (id: string) => {
    setStaff((prev) => prev.filter((m) => m.id !== id));
    setFlash(t("memberRemoved"));
    window.setTimeout(() => setFlash(null), 2500);
  };

  return (
    <>
      <PageHead title={t("team")} />

      <div style={{ display: "flex", gap: S[5], flexWrap: "wrap", marginBottom: S[5] }}>
        {roleCounts.map((r) => (
          <div key={r.role}>
            <span className="qp-count" style={{ ...MONO, ...T.h2, color: C.brand }}>{r.count}</span>
            <span style={{ ...T.caption, color: C.muted, marginInlineStart: S[2] }}>{r.label}</span>
          </div>
        ))}
      </div>

      {/* Add member */}
      <section style={{ ...card({ pad: S[5], radius: 14 }), marginBottom: S[5] }}>
        <div style={{ ...T.body, fontSize: 15, fontWeight: 600, marginBottom: S[3] }}>{t("addMember")}</div>
        <div style={{ display: "flex", gap: S[2], flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={LABEL_STYLE} htmlFor="qp-member-name">{t("memberName")}</label>
            <input
              id="qp-member-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addMember();
              }}
              placeholder={t("nameRequired")}
              style={field()}
            />
          </div>
          <div style={{ minWidth: 160 }}>
            <label style={LABEL_STYLE} htmlFor="qp-member-role">{t("memberRole")}</label>
            <select
              id="qp-member-role"
              value={role}
              onChange={(e) => setRole(e.target.value as StaffMember["role"])}
              style={{ ...field(), padding: "11px 13px" }}
            >
              {ADDABLE_ROLES.map((r) => (
                <option key={r} value={r}>{t(ROLE_LABEL[r])}</option>
              ))}
            </select>
          </div>
          <button type="button" className="qp-press" onClick={addMember} style={{ ...btn("primary", { size: "sm" }), minHeight: 44 }}>
            {t("add")}
          </button>
        </div>
      </section>

      <div style={{ ...card({ pad: S[5], radius: 14 }) }}>
        <TeamPanel locale={locale} branchId="all" staff={staff} onRemove={removeMember} />
      </div>

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
