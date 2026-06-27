"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BRAND } from "../../lib/data";
import {
  createAdmin,
  deleteAdmin,
  getMe,
  listAdmins,
  logout,
  type AdminAccount,
  type Me,
} from "../../lib/api";

export default function SuperadminPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () =>
    listAdmins()
      .then(setAdmins)
      .catch(() => {});

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
    if (
      !confirm(
        `Delete ${a.email}? Their tables and receipts are permanently removed.`,
      )
    )
      return;
    try {
      await deleteAdmin(a.id);
      setNotice(`Deleted ${a.email}.`);
      setError("");
      refresh();
    } catch {
      setError(`Couldn't delete ${a.email}. Please retry.`);
    }
  };

  const signOut = async () => {
    await logout();
    router.push("/admin/login");
    router.refresh();
  };

  const field = {
    width: "100%",
    padding: "12px 14px",
    border: "1.5px solid #E2E8F0",
    borderRadius: 12,
    fontFamily: "inherit",
    fontSize: 15,
    outline: "none",
    color: "#0B1221",
    background: "#fff",
    boxSizing: "border-box" as const,
  } as const;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F8FAFC",
        color: "#0B1221",
        fontFamily: "inherit",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          background: "#0B1221",
          color: "#fff",
          padding: "18px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: BRAND,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>QPay · Super Admin</div>
            <div style={{ fontSize: 12, color: "#94A3B8" }}>
              {me?.email ?? "…"}
            </div>
          </div>
        </div>
        <button
          onClick={signOut}
          style={{
            border: "none",
            background: "#161F33",
            color: "#fff",
            borderRadius: 10,
            padding: "9px 16px",
            fontFamily: "inherit",
            fontSize: 13.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 4px" }}>
          Admin accounts
        </h1>
        <p style={{ fontSize: 14, color: "#64748B", margin: "0 0 26px", fontWeight: 600 }}>
          Issue credentials for restaurant admins. Each admin sees only their own
          tables and receipts.
        </p>

        {/* Create form */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 18,
            padding: 22,
            marginBottom: 26,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>
            Create a new admin
          </h3>
          <form
            onSubmit={submit}
            className="qp-grid-2"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "start" }}
          >
            <input
              type="email"
              required
              aria-label="New admin email"
              placeholder="admin@restaurant.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={field}
            />
            <input
              type="password"
              required
              minLength={8}
              aria-label="New admin password"
              placeholder="Password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={field}
            />
            <button
              type="submit"
              disabled={busy}
              style={{
                padding: "12px 20px",
                background: BRAND,
                color: "#fff",
                border: "none",
                borderRadius: 12,
                fontFamily: "inherit",
                fontSize: 15,
                fontWeight: 800,
                cursor: busy ? "default" : "pointer",
                opacity: busy ? 0.7 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {busy ? "Creating…" : "Create admin"}
            </button>
          </form>
          {error && (
            <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: "#DC2626" }}>
              {error}
            </div>
          )}
          {notice && (
            <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: "#15803D" }}>
              {notice}
            </div>
          )}
        </div>

        {/* Admin list */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 18,
            padding: 22,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px" }}>
            {admins.length} admin{admins.length === 1 ? "" : "s"}
          </h3>
          {admins.length === 0 ? (
            <div style={{ fontSize: 13.5, color: "#64748B", fontWeight: 600, padding: "8px 0" }}>
              No admins yet. Create one above.
            </div>
          ) : (
            admins.map((a) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "14px 0",
                  borderBottom: "1px solid #F1F5F9",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {a.email}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>
                    Created {new Date(a.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => remove(a)}
                  style={{
                    padding: "8px 14px",
                    background: "#fff",
                    color: "#DC2626",
                    border: "1.5px solid #FECACA",
                    borderRadius: 10,
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
