"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "../../lib/api";
import { C, R, S, T, SHADOW, btn, field } from "../../lib/theme";
import { Alert, Spinner } from "../../components/ui/Primitives";
import { Wordmark } from "../../components/site/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [from, setFrom] = useState("");

  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get("from");
    if (f && f.startsWith("/admin")) setFrom(f);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const role = await login(email, password);
    setBusy(false);
    if (role) {
      // Route by role: the super account manages admins; admins get the
      // restaurant dashboard. Honor an explicit `from` only for admins.
      const dest =
        role === "super" ? "/admin/superadmin" : from || "/admin";
      router.push(dest);
      router.refresh();
    } else {
      setError("Invalid credentials.");
    }
  };

  const labelStyle = { ...T.label, color: C.muted, display: "block" } as const;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg,#EEF2FF,#F8FAFC 45%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: S[4],
        fontFamily: "inherit",
        color: C.text,
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <Link
          href="/"
          aria-label="QPay home"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: S[5],
            textDecoration: "none",
          }}
        >
          <Wordmark size={22} markSize={34} color={C.text} />
        </Link>

        <div style={{ ...cardBox }}>
          <h1 style={{ ...T.h2, margin: `0 0 ${S[1]}px` }}>Manager sign in</h1>
          <p style={{ ...T.body, color: C.muted, margin: `0 0 ${S[5]}px` }}>
            Access the QPay admin dashboard.
          </p>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: S[4] }}>
            {error && <Alert kind="danger">{error}</Alert>}

            <div style={{ display: "flex", flexDirection: "column", gap: S[2] }}>
              <label htmlFor="login-email" style={labelStyle}>
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                name="email"
                autoComplete="email"
                placeholder="you@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={field()}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: S[2] }}>
              <label htmlFor="login-password" style={labelStyle}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  name="password"
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...field(), paddingRight: 46 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  style={{
                    position: "absolute",
                    top: "50%",
                    right: 6,
                    transform: "translateY(-50%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 34,
                    height: 34,
                    border: "none",
                    background: "transparent",
                    color: C.muted,
                    cursor: "pointer",
                    borderRadius: R.xs,
                  }}
                >
                  {showPassword ? (
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  ) : (
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="qp-cta"
              style={{ ...btn("primary", { full: true, disabled: busy }), marginTop: S[1], fontSize: 16, padding: 14 }}
            >
              {busy && <Spinner size={16} color="#fff" />}
              {busy ? "Signing in." : "Sign in"}
            </button>
          </form>

          <div
            style={{
              marginTop: S[5],
              display: "flex",
              alignItems: "center",
              gap: S[2],
              ...T.caption,
              color: C.muted,
            }}
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Accounts are issued by your administrator.
          </div>
        </div>
      </div>
    </div>
  );
}

const cardBox: React.CSSProperties = {
  background: C.surface,
  borderRadius: R.xl,
  padding: S[6],
  border: `1px solid ${C.border}`,
  boxShadow: SHADOW.e3,
};
