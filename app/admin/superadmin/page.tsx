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

export default function SuperadminPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  // Per-row inline editing of an admin's email + password.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
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
      const res = await createAdmin(email.trim(), password);
      if (res.ok) {
        setNotice(`Created admin ${res.account.email}.`);
        setEmail("");
        setPassword("");
        refresh();
      } else {
        setError(res.error);
      }
    } catch {
      setError("Network error. Please retry.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (a: AdminAccount) => {
    setConfirmId(null);
    try {
      await deleteAdmin(a.id);
      setNotice(`Deleted ${a.email}.`);
      setError("");
      refresh();
    } catch {
      setError(`Couldn't delete ${a.email}. Please retry.`);
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
          `Renewed ${a.email}. Now valid until ${new Date(
            res.account.expiresAt ?? "",
          ).toLocaleDateString()}.`,
        );
        refresh();
      } else {
        setError(res.error);
      }
    } catch {
      setError(`Couldn't renew ${a.email}. Please retry.`);
    } finally {
      setRowBusy(null);
    }
  };

  const startEdit = (a: AdminAccount) => {
    setEditingId(a.id);
    setEditEmail(a.email);
    setEditPassword("");
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
    const patch: { email?: string; password?: string } = {};
    const trimmed = editEmail.trim();
    if (trimmed && trimmed !== a.email) patch.email = trimmed;
    if (editPassword) patch.password = editPassword;
    if (!patch.email && !patch.password) {
      cancelEdit();
      return;
    }
    setRowBusy(a.id);
    try {
      const res = await updateAdmin(a.id, patch);
      if (res.ok) {
        setNotice(`Updated ${res.account.email}.`);
        cancelEdit();
        refresh();
      } else {
        setError(res.error);
      }
    } catch {
      setError(`Couldn't update ${a.email}. Please retry.`);
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
          <LogoMark size={30} onDark />
          <div>
            <div style={{ ...T.h3, color: "#fff" }}>Nuqra · Super Admin</div>
            <div style={{ ...T.caption, color: C.faint }}>{me?.email ?? "."}</div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="qp-btn"
          style={{ ...btn("secondary", { size: "sm" }), background: C.inkSoft, color: "#fff", borderColor: "transparent" }}
        >
          Sign out
        </button>
      </div>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: `${S[6]}px ${S[5]}px` }}>
        <h1 style={{ ...T.h1, margin: `0 0 ${S[1]}px` }}>Admin accounts</h1>
        <p style={{ ...T.body, color: C.muted, margin: `0 0 ${S[5]}px` }}>
          Issue credentials for restaurant admins. Each admin sees only their own
          tables and receipts.
        </p>

        {/* Create form */}
        <div style={{ ...card({ pad: S[5] }), marginBottom: S[5] }}>
          <h2 style={{ ...T.h3, margin: `0 0 ${S[4]}px` }}>Create a new admin</h2>
          <form
            onSubmit={submit}
            className="qp-grid-2"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: S[3], alignItems: "start" }}
          >
            <input
              type="email"
              required
              aria-label="New admin email"
              placeholder="admin@restaurant.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={field()}
            />
            <input
              type="password"
              required
              minLength={8}
              aria-label="New admin password"
              placeholder="Password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={field()}
            />
            <button
              type="submit"
              disabled={busy}
              className="qp-cta"
              style={{ ...btn("primary", { disabled: busy }), whiteSpace: "nowrap" }}
            >
              {busy && <Spinner size={15} color="#fff" />}
              {busy ? "Creating." : "Create admin"}
            </button>
          </form>
          {error && <div style={{ marginTop: S[3] }}><Alert kind="danger">{error}</Alert></div>}
          {notice && <div style={{ marginTop: S[3] }}><Alert kind="success">{notice}</Alert></div>}
        </div>

        {/* Admin list */}
        <div style={card({ pad: S[5] })}>
          <h2 style={{ ...T.h3, margin: `0 0 ${S[4]}px` }}>
            {loaded ? `${admins.length} admin${admins.length === 1 ? "" : "s"}` : "Admins"}
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
              title="No admins yet"
              body="Create your first restaurant admin using the form above."
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
                        {a.source === "demo" ? "Trial" : "Manual"}
                      </span>
                      <span style={badge(a.active ? "success" : "danger")}>
                        {a.active ? "Active" : "Expired"}
                      </span>
                    </div>
                    <div style={{ ...T.caption, color: C.muted, marginTop: S[1] }}>
                      Created {new Date(a.createdAt).toLocaleDateString()}
                      {a.expiresAt
                        ? `, ${a.active ? "expires" : "expired"} ${new Date(
                            a.expiresAt,
                          ).toLocaleDateString()}`
                        : ", no expiry"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: S[2], flexWrap: "wrap" }}>
                    <button
                      onClick={() => renew(a)}
                      disabled={rowBusy === a.id}
                      className="qp-btn"
                      style={btn("success", { size: "sm", disabled: rowBusy === a.id })}
                    >
                      {rowBusy === a.id ? <Spinner size={14} color="#fff" /> : "Renew 30d"}
                    </button>
                    <button
                      onClick={() =>
                        editingId === a.id ? cancelEdit() : startEdit(a)
                      }
                      className="qp-btn"
                      style={btn("secondary", { size: "sm" })}
                    >
                      {editingId === a.id ? "Cancel" : "Edit"}
                    </button>
                    {confirmId === a.id ? (
                      <>
                        <button
                          onClick={() => remove(a)}
                          className="qp-btn"
                          style={{ ...btn("danger", { size: "sm" }), background: STATUS.danger.fg, color: "#fff", borderColor: "transparent" }}
                        >
                          Confirm delete
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="qp-btn"
                          style={btn("ghost", { size: "sm" })}
                        >
                          Keep
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmId(a.id)}
                        className="qp-btn"
                        style={btn("danger", { size: "sm" })}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                {confirmId === a.id && (
                  <div style={{ marginTop: S[3] }}>
                    <Alert kind="warn">
                      Delete {a.email}? Their tables and receipts are permanently
                      removed. This cannot be undone.
                    </Alert>
                  </div>
                )}
                {editingId === a.id && (
                  <div
                    className="qp-grid-2"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr auto",
                      gap: S[3],
                      marginTop: S[3],
                      padding: S[4],
                      background: C.surfaceAlt,
                      borderRadius: R.md,
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="email"
                      aria-label={`New email for ${a.email}`}
                      placeholder="New email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      style={field()}
                    />
                    <input
                      type="password"
                      aria-label={`New password for ${a.email}`}
                      placeholder="New password (min 8, blank = unchanged)"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      style={field()}
                    />
                    <button
                      onClick={() => saveEdit(a)}
                      disabled={rowBusy === a.id}
                      className="qp-cta"
                      style={{ ...btn("primary", { disabled: rowBusy === a.id }), whiteSpace: "nowrap" }}
                    >
                      {rowBusy === a.id && <Spinner size={15} color="#fff" />}
                      {rowBusy === a.id ? "Saving." : "Save"}
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
