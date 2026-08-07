"use client";

// /demo/admin/team: the team panel promoted to a page. Every staff member
// grouped by branch (group-wide, branchId = "all"), plus a role-count summary.

import { C, S, T, MONO, card } from "../../../lib/theme";
import { STAFF, type StaffMember } from "../../_data";
import { TeamPanel, PageHead, useAdminDemo, tr, ROLE_LABEL, type UIKey } from "../_shared";

const ROLE_ORDER: StaffMember["role"][] = ["owner", "branch_manager", "server", "cashier"];

export default function TeamPage() {
  const { locale } = useAdminDemo();
  const t = (k: UIKey) => tr(locale, k);

  const roleCounts = ROLE_ORDER.map((role) => ({
    role,
    label: t(ROLE_LABEL[role]),
    count: STAFF.filter((s) => s.role === role).length,
  })).filter((r) => r.count > 0);

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

      <div style={{ ...card({ pad: S[5], radius: 14 }) }}>
        <TeamPanel locale={locale} branchId="all" />
      </div>
    </>
  );
}
