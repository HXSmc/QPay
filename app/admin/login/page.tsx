"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BRAND } from "../../lib/data";
import { login } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
  } as const;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg,#EEF2FF,#F8FAFC 45%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "inherit",
        color: "#0B1221",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginBottom: 22,
            textDecoration: "none",
            color: "#0B1221",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: BRAND,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(46,91,255,0.35)",
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-4-4" />
            </svg>
          </div>
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>QPay</span>
        </Link>

        <div
          style={{
            background: "#fff",
            borderRadius: 22,
            padding: 28,
            border: "1px solid #E2E8F0",
            boxShadow: "0 24px 60px rgba(11,18,33,0.12)",
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Manager sign in</h1>
          <p style={{ fontSize: 14, color: "#475569", margin: "0 0 20px" }}>
            Access the QPay admin dashboard.
          </p>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="email"
              required
              aria-label="Email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={field}
            />
            <input
              type="password"
              required
              aria-label="Password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={field}
            />
            {error && (
              <div style={{ fontSize: 13, fontWeight: 600, color: "#DC2626" }}>{error}</div>
            )}
            <button
              type="submit"
              disabled={busy}
              style={{
                width: "100%",
                marginTop: 4,
                padding: 14,
                background: BRAND,
                color: "#fff",
                border: "none",
                borderRadius: 13,
                fontFamily: "inherit",
                fontSize: 16,
                fontWeight: 800,
                cursor: busy ? "default" : "pointer",
                opacity: busy ? 0.7 : 1,
                boxShadow: "0 10px 24px rgba(46,91,255,0.3)",
              }}
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12.5,
              color: "#64748B",
              fontWeight: 600,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
