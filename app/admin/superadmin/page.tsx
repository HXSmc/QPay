"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createAdmin,
  deleteAdmin,
  getMe,
  listAdmins,
  logout,
  renewAdmin,
  updateAdmin,
  type AdminAccount,
  type Me,
} from "../../lib/api";
import { C, R, S, T, STATUS, btn, card, field, badge } from "../../lib/theme";
import { Alert, EmptyState, Skeleton, Spinner } from "../../components/ui/Primitives";
import { LogoMark } from "../../components/site/Logo";
import { useT } from "../../lib/i18n-client";
import { POS_SYSTEMS, posName } from "../../lib/pos";

// Small labeled-field wrapper for the super console forms (label above input,
// optional hint to clarify who can edit what).
function Labeled({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: S[2], marginBottom: 5 }}>
        <span style={{ ...T.label, color: C.text }}>{label}</span>
        {hint && <span style={{ ...T.caption, color: C.muted }}>· {hint}</span>}
      </div>
      {children}
    </div>
  );
}

export default function SuperadminPage() {
  const router = useRouter();
  const tr = useT();
  const [me, setMe] = useState<Me | null>(null);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Create-form config (name + POS are create-only; counts/caps super-set).
  const [cName, setCName] = useState("");
  const [cTables, setCTables] = useState("");
  const [cMaxTables, setCMaxTables] = useState("");
  const [cBranches, setCBranches] = useState("");
  const [cMaxBranches, setCMaxBranches] = useState("");
  const [cPos, setCPos] = useState("");
  const [cPosKey, setCPosKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  // Per-row inline editing of an admin's email/password + counts/caps.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editTables, setEditTables] = useState("");
  const [editBranches, setEditBranches] = useState("");
  const [editMaxTables, setEditMaxTables] = useState("");
  const [editMaxBranches, setEditMaxBranches] = useState("");
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  // Two-step inline delete confirm (replaces window.confirm).
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const refresh = () =>
    listAdmins()
      .then(setAdmins)
      .catch(() => {})
      .finally(() => setLoaded(true));

  useEffect(() => {
    getMe().then(setMe).catch(() => {});
    refresh();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const numOrU = (s: string) => (s.trim() ? Number(s) : undefined);
      const res = await createAdmin(email.trim(), password, {
        name: cName.trim() || undefined,
        tables: numOrU(cTables),
        maxTables: numOrU(cMaxTables),
        branches: numOrU(cBranches),
        maxBranches: numOrU(cMaxBranches),
        posSystem: cPos || undefined,
        posApiKey: cPosKey.trim() || undefined,
      });
      if (res.ok) {
        setNotice(`${tr("Created admin")} ${res.account.email}.`);
        setEmail("");
        setPassword("");
        setCName("");
        setCTables("");
        setCMaxTables("");
        setCBranches("");
        setCMaxBranches("");
        setCPos("");
        setCPosKey("");
        refresh();
      } else {
        setError(res.error);
      }
    } catch {
      setError(`${tr("Network error.")} ${tr("Please retry.")}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (a: AdminAccount) => {
    setConfirmId(null);
    try {
      await deleteAdmin(a.id);
      setNotice(`${tr("Deleted")} ${a.email}.`);
      setError("");
      refresh();
    } catch {
      setError(`${tr("Couldn't delete")} ${a.email}. ${tr("Please retry.")}`);
    }
  };

  const renew = async (a: AdminAccount) => {
    setError("");
    setNotice("");
    setRowBusy(a.id);
    try {
      const res = await renewAdmin(a.id);
      if (res.ok) {
        setNotice(
          `${tr("Renewed")} ${a.email}. ${tr("Now valid until")} ${new Date(
            res.account.expiresAt ?? "",
          ).toLocaleDateString()}.`,
        );
        refresh();
      } else {
        setError(res.error);
      }
    } catch {
      setError(`${tr("Couldn't renew")} ${a.email}. ${tr("Please retry.")}`);
    } finally {
      setRowBusy(null);
    }
  };

  const startEdit = (a: AdminAccount) => {
    setEditingId(a.id);
    setEditEmail(a.email);
    setEditPassword("");
    setEditTables(a.config?.tables ? String(a.config.tables) : "");
    setEditBranches(a.config?.branches ? String(a.config.branches) : "");
    setEditMaxTables(a.config?.maxTables ? String(a.config.maxTables) : "");
    setEditMaxBranches(a.config?.maxBranches ? String(a.config.maxBranches) : "");
    setError("");
    setNotice("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditEmail("");
    setEditPassword("");
  };

  const saveEdit = async (a: AdminAccount) => {
    setError("");
    setNotice("");
    const numOr = (s: string, fallback: number) => (s.trim() ? Number(s) : fallback);
    const patch: {
      email?: string;
      password?: string;
      tables?: number;
      branches?: number;
      maxTables?: number;
      maxBranches?: number;
    } = {};
    const trimmed = editEmail.trim();
    if (trimmed && trimmed !== a.email) patch.email = trimmed;
    if (editPassword) patch.password = editPassword;
    // Counts: a blank field means "leave as is" (don't wipe to 0). Caps: a blank
    // field means "no cap" (0 = unlimited), the way you remove a limit.
    const tU = editTables.trim() ? Number(editTables) : undefined;
    const bU = editBranches.trim() ? Number(editBranches) : undefined;
    const mt = numOr(editMaxTables, 0);
    const mb = numOr(editMaxBranches, 0);
    if (tU !== undefined && tU !== (a.config?.tables ?? 0)) patch.tables = tU;
    if (bU !== undefined && bU !== (a.config?.branches ?? 0)) patch.branches = bU;
    if (mt !== (a.config?.maxTables ?? 0)) patch.maxTables = mt;
    if (mb !== (a.config?.maxBranches ?? 0)) patch.maxBranches = mb;
    if (Object.keys(patch).length === 0) {
      cancelEdit();
      return;
    }
    setRowBusy(a.id);
    try {
      const res = await updateAdmin(a.id, patch);
      if (res.ok) {
        setNotice(`${tr("Updated")} ${res.account.email}.`);
        cancelEdit();
        refresh();
      } else {
        setError(res.error);
      }
    } catch {
      setError(`${tr("Couldn't update")} ${a.email}. ${tr("Please retry.")}`);
    } finally {
      setRowBusy(null);
    }
  };

  const signOut = async () => {
    await logout();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.surfaceAlt,
        color: C.text,
        fontFamily: "inherit",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          background: C.ink,
          color: "#fff",
          padding: `${S[3]}px ${S[6]}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: S[3] }}>
          <LogoMark size={30} onDark decorative />
          <div>
            <div style={{ ...T.h3, color: "#fff" }}>{tr("Nuqra · Super Admin")}</div>
            {/* C.faint (not C.muted) — passes AA on this dark ink bar (~7.3:1). */}
            <div style={{ ...T.caption, color: C.faint }}>{me?.email ?? "."}</div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="qp-btn"
          style={{ ...btn("secondary", { size: "sm" }), background: C.inkSoft, color: "#fff", borderColor: "transparent" }}
        >
          {tr("Sign out")}
        </button>
      </div>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: `${S[6]}px ${S[5]}px` }}>
        <h1 style={{ ...T.h1, margin: `0 0 ${S[1]}px` }}>{tr("Admin accounts")}</h1>
        <p style={{ ...T.body, color: C.muted, margin: `0 0 ${S[5]}px` }}>
          {tr("Issue credentials for restaurant admins. Each admin sees only their own tables and receipts.")}
        </p>

        {/* Create form */}
        <div style={{ ...card({ pad: S[5] }), marginBottom: S[5] }}>
          <h2 style={{ ...T.h3, margin: `0 0 ${S[4]}px` }}>{tr("Create a new admin")}</h2>
          <form onSubmit={submit} style={{ display: "grid", gap: S[4] }}>
            <div className="qp-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: S[3] }}>
              <Labeled label={tr("Login email")}>
                <input
                  type="email"
                  required
                  aria-label={tr("New admin email")}
                  placeholder="admin@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={field()}
                />
              </Labeled>
              <Labeled label={tr("Password (min 8 chars)")}>
                <input
                  type="password"
                  required
                  minLength={8}
                  aria-label={tr("New admin password")}
                  placeholder={tr("Password (min 8 chars)")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={field()}
                />
              </Labeled>
            </div>

            {/* Create-only: restaurant name + POS (the admin edits these later;
                the super cannot edit them after creation). */}
            <Labeled label={tr("Restaurant name")} hint={tr("the owner can edit this later")}>
              <input
                aria-label={tr("Restaurant name")}
                placeholder={tr("The Copper Kitchen")}
                value={cName}
                onChange={(e) => setCName(e.target.value)}
                style={field()}
              />
            </Labeled>
            <div className="qp-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: S[3] }}>
              <Labeled label={tr("POS system")} hint={tr("the owner finishes setup later")}>
                <select aria-label={tr("POS system")} value={cPos} onChange={(e) => { setCPos(e.target.value); setCPosKey(""); }} style={field()}>
                  <option value="">{tr("None")}</option>
                  {POS_SYSTEMS.filter((p) => p.id !== "none").map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Labeled>
              <Labeled label={tr("POS API key")}>
                <input
                  type="password"
                  autoComplete="new-password"
                  aria-label={tr("POS API key")}
                  placeholder={tr("Paste the POS API key")}
                  value={cPosKey}
                  onChange={(e) => setCPosKey(e.target.value)}
                  disabled={!cPos}
                  style={field()}
                />
              </Labeled>
            </div>

            {/* Counts (owner + super editable) + caps (super only). */}
            <div className="qp-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: S[3] }}>
              <Labeled label={tr("Tables")}>
                <input type="number" min={0} inputMode="numeric" aria-label={tr("Tables")} value={cTables} onChange={(e) => setCTables(e.target.value)} style={field()} />
              </Labeled>
              <Labeled label={tr("Max tables")} hint={tr("super only")}>
                <input type="number" min={0} inputMode="numeric" aria-label={tr("Max tables")} value={cMaxTables} onChange={(e) => setCMaxTables(e.target.value)} style={field()} />
              </Labeled>
              <Labeled label={tr("Branches")}>
                <input type="number" min={0} inputMode="numeric" aria-label={tr("Branches")} value={cBranches} onChange={(e) => setCBranches(e.target.value)} style={field()} />
              </Labeled>
              <Labeled label={tr("Max branches")} hint={tr("super only")}>
                <input type="number" min={0} inputMode="numeric" aria-label={tr("Max branches")} value={cMaxBranches} onChange={(e) => setCMaxBranches(e.target.value)} style={field()} />
              </Labeled>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="qp-cta"
              style={{ ...btn("primary", { disabled: busy }), whiteSpace: "nowrap", justifySelf: "start" }}
            >
              {busy && <Spinner size={15} color="#fff" />}
              {busy ? tr("Creating.") : tr("Create admin")}
            </button>
          </form>
          {error && <div style={{ marginTop: S[3] }}><Alert kind="danger">{error}</Alert></div>}
          {notice && <div style={{ marginTop: S[3] }}><Alert kind="success">{notice}</Alert></div>}
        </div>

        {/* Admin list */}
        <div style={card({ pad: S[5] })}>
          <h2 style={{ ...T.h3, margin: `0 0 ${S[4]}px` }}>
            {loaded ? `${admins.length} ${tr(admins.length === 1 ? "admin" : "admins")}` : tr("Admins")}
          </h2>

          {!loaded ? (
            <div style={{ display: "flex", flexDirection: "column", gap: S[4] }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: S[3] }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: S[2] }}>
                    <Skeleton h={16} w="55%" />
                    <Skeleton h={12} w="40%" />
                  </div>
                  <Skeleton h={32} w={210} radius={R.sm} />
                </div>
              ))}
            </div>
          ) : admins.length === 0 ? (
            <EmptyState
              icon={
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" x2="19" y1="8" y2="14" />
                  <line x1="22" x2="16" y1="11" y2="11" />
                </svg>
              }
              title={tr("No admins yet")}
              body={tr("Create your first restaurant admin using the form above.")}
            />
          ) : (
            admins.map((a) => (
              <div
                key={a.id}
                style={{
                  padding: `${S[4]}px 0`,
                  borderBottom: `1px solid ${C.canvas}`,
                }}
              >
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
                    <div
                      style={{
                        fontSize: 14.5,
                        fontWeight: 700,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "flex",
                        alignItems: "center",
                        gap: S[2],
                        flexWrap: "wrap",
                      }}
                    >
                      {a.email}
                      <span style={badge(a.source === "demo" ? "info" : "neutral")}>
                        {a.source === "demo" ? tr("Trial") : tr("Manual")}
                      </span>
                      <span style={badge(a.active ? "success" : "danger")}>
                        {a.active ? tr("Active") : tr("Expired")}
                      </span>
                    </div>
                    <div style={{ ...T.caption, color: C.muted, marginTop: S[1] }}>
                      {tr("Created")} {new Date(a.createdAt).toLocaleDateString()}
                      {a.expiresAt
                        ? `, ${a.active ? tr("expires") : tr("expired")} ${new Date(
                            a.expiresAt,
                          ).toLocaleDateString()}`
                        : `, ${tr("no expiry")}`}
                    </div>
                    {a.config && (
                      <div style={{ ...T.caption, color: C.muted, marginTop: S[1] }}>
                        {a.config.name ? `${a.config.name} · ` : ""}
                        {tr("Tables")} {a.config.tables}
                        {a.config.maxTables ? `/${a.config.maxTables}` : ""} · {tr("Branches")}{" "}
                        {a.config.branches}
                        {a.config.maxBranches ? `/${a.config.maxBranches}` : ""}
                        {a.config.posSystem ? ` · ${posName(a.config.posSystem)}` : ""}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: S[2], flexWrap: "wrap" }}>
                    <button
                      onClick={() => renew(a)}
                      disabled={rowBusy === a.id}
                      className="qp-btn"
                      style={btn("success", { size: "sm", disabled: rowBusy === a.id })}
                    >
                      {rowBusy === a.id ? <Spinner size={14} color="#fff" /> : tr("Renew 30d")}
                    </button>
                    <button
                      onClick={() =>
                        editingId === a.id ? cancelEdit() : startEdit(a)
                      }
                      className="qp-btn"
                      style={btn("secondary", { size: "sm" })}
                    >
                      {editingId === a.id ? tr("Cancel") : tr("Edit")}
                    </button>
                    {confirmId === a.id ? (
                      <>
                        <button
                          onClick={() => remove(a)}
                          className="qp-btn"
                          style={{ ...btn("danger", { size: "sm" }), background: STATUS.danger.fg, color: "#fff", borderColor: "transparent" }}
                        >
                          {tr("Confirm delete")}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="qp-btn"
                          style={btn("ghost", { size: "sm" })}
                        >
                          {tr("Keep")}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmId(a.id)}
                        className="qp-btn"
                        style={btn("danger", { size: "sm" })}
                      >
                        {tr("Delete")}
                      </button>
                    )}
                  </div>
                </div>
                {confirmId === a.id && (
                  <div style={{ marginTop: S[3] }}>
                    <Alert kind="warn">
                      {tr("Delete")} {a.email}{tr("? Their tables and receipts are permanently removed. This cannot be undone.")}
                    </Alert>
                  </div>
                )}
                {editingId === a.id && (
                  <div
                    style={{
                      display: "grid",
                      gap: S[3],
                      marginTop: S[3],
                      padding: S[4],
                      background: C.surfaceAlt,
                      borderRadius: R.md,
                    }}
                  >
                    <div className="qp-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: S[3] }}>
                      <input
                        type="email"
                        aria-label={`${tr("New email for")} ${a.email}`}
                        placeholder={tr("New email")}
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        style={field()}
                      />
                      <input
                        type="password"
                        aria-label={`${tr("New password for")} ${a.email}`}
                        placeholder={tr("New password (min 8, blank = unchanged)")}
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        style={field()}
                      />
                    </div>
                    <div className="qp-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: S[3] }}>
                      <Labeled label={tr("Tables")}>
                        <input type="number" min={0} inputMode="numeric" aria-label={`${tr("Tables")} — ${a.email}`} value={editTables} onChange={(e) => setEditTables(e.target.value)} style={field()} />
                      </Labeled>
                      <Labeled label={tr("Max tables")} hint={tr("super only")}>
                        <input type="number" min={0} inputMode="numeric" aria-label={`${tr("Max tables")} — ${a.email}`} value={editMaxTables} onChange={(e) => setEditMaxTables(e.target.value)} style={field()} />
                      </Labeled>
                      <Labeled label={tr("Branches")}>
                        <input type="number" min={0} inputMode="numeric" aria-label={`${tr("Branches")} — ${a.email}`} value={editBranches} onChange={(e) => setEditBranches(e.target.value)} style={field()} />
                      </Labeled>
                      <Labeled label={tr("Max branches")} hint={tr("super only")}>
                        <input type="number" min={0} inputMode="numeric" aria-label={`${tr("Max branches")} — ${a.email}`} value={editMaxBranches} onChange={(e) => setEditMaxBranches(e.target.value)} style={field()} />
                      </Labeled>
                    </div>
                    <button
                      onClick={() => saveEdit(a)}
                      disabled={rowBusy === a.id}
                      className="qp-cta"
                      style={{ ...btn("primary", { disabled: rowBusy === a.id }), whiteSpace: "nowrap", justifySelf: "start" }}
                    >
                      {rowBusy === a.id && <Spinner size={15} color="#fff" />}
                      {rowBusy === a.id ? tr("Saving.") : tr("Save")}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
