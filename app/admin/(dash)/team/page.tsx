"use client";

import { useEffect, useState } from "react";
import {
  createTeamAdmin,
  deleteTeamAdmin,
  listBranches,
  listTeamAdmins,
  updateTeamAdmin,
  type TeamAdmin,
} from "../../../lib/api";
import type { Branch } from "../../../lib/types";
import { C, R, S, T, badge, btn, card, field } from "../../../lib/theme";
import { Alert, EmptyState, Skeleton, Spinner } from "../../../components/ui/Primitives";
import { useT } from "../../../lib/i18n-client";

export default function TeamPage() {
  const tr = useT();
  const [admins, setAdmins] = useState<TeamAdmin[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = async () => {
    const [a, b] = await Promise.all([listTeamAdmins(), listBranches()]);
    setAdmins(a);
    setBranches(b);
  };

  useEffect(() => {
    reload()
      .catch(() => setError(tr("Couldn't load your team. Please refresh.")))
      .finally(() => setLoading(false));
  }, []);

  const branchName = (id: string | null) =>
    branches.find((b) => b.id === id)?.name ?? tr("Unassigned");

  return (
    <div className="qp-page" style={{ padding: `${S[6]}px ${S[6] + 4}px`, maxWidth: 860 }}>
      <div style={{ marginBottom: S[5] }}>
        <div style={{ ...T.label, color: C.brand, marginBottom: S[1] }}>{tr("Team")}</div>
        <h1 style={{ ...T.h1, margin: 0, color: C.text }}>{tr("Branch administrators")}</h1>
        <p style={{ ...T.body, color: C.muted, margin: `${S[2]}px 0 0`, maxWidth: 560 }}>
          {tr(
            "Create a login for each branch. A branch admin manages only that branch's tables, orders, and menu — never the chain.",
          )}
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: S[4] }}>
          <Alert kind="danger">{error}</Alert>
        </div>
      )}

      <CreateAdmin branches={branches} onCreated={reload} />

      {loading ? (
        <div style={{ display: "grid", gap: S[4], marginTop: S[5] }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} h={120} radius={R.lg} />
          ))}
        </div>
      ) : admins.length === 0 ? (
        <div style={{ marginTop: S[5] }}>
          <EmptyState
            title={tr("No branch admins yet")}
            body={tr("Add one above to give a branch its own login.")}
          />
        </div>
      ) : (
        <div style={{ display: "grid", gap: S[4], marginTop: S[5] }}>
          {admins.map((a) => (
            <AdminRow
              key={a.id}
              admin={a}
              branches={branches}
              branchName={branchName(a.branchId)}
              onChanged={reload}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateAdmin({
  branches,
  onCreated,
}: {
  branches: Branch[];
  onCreated: () => Promise<void>;
}) {
  const tr = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [branchId, setBranchId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const label = { ...T.label, color: C.muted, display: "block", marginBottom: S[2] } as const;

  // Default the branch select to the first branch once they load.
  useEffect(() => {
    if (!branchId && branches[0]) setBranchId(branches[0].id);
  }, [branches]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    setError("");
    setOk(false);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(tr("Enter a valid email address."));
      return;
    }
    if (password.length < 8) {
      setError(tr("Password must be at least 8 characters."));
      return;
    }
    if (!branchId) {
      setError(tr("Choose a branch."));
      return;
    }
    setBusy(true);
    const res = await createTeamAdmin(email.trim(), password, branchId);
    setBusy(false);
    if (!res.ok) {
      setError(tr(res.error));
      return;
    }
    setEmail("");
    setPassword("");
    setOk(true);
    setTimeout(() => setOk(false), 2500);
    await onCreated();
  };

  return (
    <div style={card({ pad: S[5] })}>
      <div style={{ ...T.h3, color: C.text, marginBottom: S[4] }}>{tr("Add a branch admin")}</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: S[4],
        }}
        className="qp-team-grid"
      >
        <div>
          <label htmlFor="ta-email" style={label}>
            {tr("Email")}
          </label>
          <input
            id="ta-email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={field()}
          />
        </div>
        <div>
          <label htmlFor="ta-pass" style={label}>
            {tr("Temporary password")}
          </label>
          <input
            id="ta-pass"
            type="text"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={tr("at least 8 characters")}
            style={field()}
          />
        </div>
        <div>
          <label htmlFor="ta-branch" style={label}>
            {tr("Branch")}
          </label>
          <select
            id="ta-branch"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            style={field()}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: S[4] }}>
          <Alert kind="danger">{error}</Alert>
        </div>
      )}
      {ok && (
        <div style={{ marginTop: S[4] }}>
          <Alert kind="success">
            {tr("Branch admin created. Share the password with them — they can change it later.")}
          </Alert>
        </div>
      )}

      <div style={{ marginTop: S[4] }}>
        <button
          onClick={submit}
          disabled={busy}
          className="qp-cta-lift"
          style={btn("primary", { size: "sm", disabled: busy })}
        >
          {busy && <Spinner size={14} color="#fff" />}
          {tr("Create login")}
        </button>
      </div>
    </div>
  );
}

function AdminRow({
  admin,
  branches,
  branchName,
  onChanged,
}: {
  admin: TeamAdmin;
  branches: Branch[];
  branchName: string;
  onChanged: () => Promise<void>;
}) {
  const tr = useT();
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(admin.email);
  const [branchId, setBranchId] = useState(admin.branchId ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const label = { ...T.label, color: C.muted, display: "block", marginBottom: S[2] } as const;

  const save = async () => {
    setBusy(true);
    setError("");
    const patch: { email?: string; password?: string; branchId?: string } = {};
    if (email.trim() && email.trim() !== admin.email) patch.email = email.trim();
    if (password) patch.password = password;
    if (branchId && branchId !== admin.branchId) patch.branchId = branchId;
    if (Object.keys(patch).length === 0) {
      setBusy(false);
      setEditing(false);
      return;
    }
    const res = await updateTeamAdmin(admin.id, patch);
    setBusy(false);
    if (!res.ok) {
      setError(tr(res.error));
      return;
    }
    setPassword("");
    setEditing(false);
    await onChanged();
  };

  const remove = async () => {
    setConfirmDel(false);
    setError("");
    try {
      await deleteTeamAdmin(admin.id);
      await onChanged();
    } catch {
      setError(tr("Couldn't remove this admin. Please retry."));
    }
  };

  return (
    <div style={card({ pad: S[5] })}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: S[3],
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ ...T.h3, color: C.text, overflow: "hidden", textOverflow: "ellipsis" }}>
            {admin.email}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: S[2], marginTop: S[2] }}>
            <span style={badge("info")}>{branchName}</span>
            <span style={badge(admin.active ? "success" : "danger")}>
              {admin.active ? tr("Active") : tr("Expired")}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: S[2] }}>
          <button
            onClick={() => setEditing((v) => !v)}
            className="qp-cta-lift"
            style={btn("secondary", { size: "sm" })}
          >
            {editing ? tr("Close") : tr("Edit")}
          </button>
          {confirmDel ? (
            <>
              <button onClick={remove} className="qp-cta-lift" style={btn("danger", { size: "sm" })}>
                {tr("Confirm?")}
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                className="qp-cta-lift"
                style={btn("secondary", { size: "sm" })}
              >
                {tr("Cancel")}
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDel(true)}
              className="qp-cta-lift"
              style={btn("danger", { size: "sm" })}
            >
              {tr("Remove")}
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div style={{ borderTop: `1px solid ${C.canvas}`, marginTop: S[4], paddingTop: S[4] }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: S[4] }}
            className="qp-grid-2"
          >
            <div>
              <label htmlFor={`e-${admin.id}`} style={label}>
                {tr("Email")}
              </label>
              <input
                id={`e-${admin.id}`}
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={field()}
              />
            </div>
            <div>
              <label htmlFor={`p-${admin.id}`} style={label}>
                {tr("New password")}
              </label>
              <input
                id={`p-${admin.id}`}
                type="text"
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tr("leave blank to keep")}
                style={field()}
              />
            </div>
            <div>
              <label htmlFor={`b-${admin.id}`} style={label}>
                {tr("Branch")}
              </label>
              <select
                id={`b-${admin.id}`}
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                style={field()}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginTop: S[4] }}>
            <button
              onClick={save}
              disabled={busy}
              className="qp-cta-lift"
              style={btn("primary", { size: "sm", disabled: busy })}
            >
              {busy && <Spinner size={14} color="#fff" />}
              {tr("Save changes")}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: S[3] }}>
          <Alert kind="danger">{error}</Alert>
        </div>
      )}
    </div>
  );
}
