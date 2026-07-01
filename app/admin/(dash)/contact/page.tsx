"use client";

import { useEffect, useState } from "react";
import {
  listContactMessages,
  sendContactMessage,
  type ContactMessage,
} from "../../../lib/api";
import { C, R, S, T, badge, btn, card, field } from "../../../lib/theme";
import { Alert, EmptyState, Skeleton, Spinner } from "../../../components/ui/Primitives";
import { useT } from "../../../lib/i18n-client";

export default function ContactPage() {
  const tr = useT();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const label = { ...T.label, color: C.muted, display: "block", marginBottom: S[2] } as const;

  const reload = () =>
    listContactMessages()
      .then(setMessages)
      .catch(() => setError(tr("Couldn't load your messages. Please refresh.")));

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    setError("");
    setSent(false);
    if (!subject.trim() || !body.trim()) {
      setError(tr("Add a subject and a message."));
      return;
    }
    setBusy(true);
    const res = await sendContactMessage(subject.trim(), body.trim());
    setBusy(false);
    if (!res.ok) {
      setError(tr(res.error));
      return;
    }
    setSubject("");
    setBody("");
    setSent(true);
    setTimeout(() => setSent(false), 3000);
    await reload();
  };

  return (
    <div className="qp-page" style={{ padding: `${S[6]}px ${S[6] + 4}px`, maxWidth: 760 }}>
      <div style={{ marginBottom: S[5] }}>
        <div style={{ ...T.label, color: C.brand, marginBottom: S[1] }}>{tr("Contact")}</div>
        <h1 style={{ ...T.h1, margin: 0, color: C.text }}>{tr("Message the Nuqra team")}</h1>
        <p style={{ ...T.body, color: C.muted, margin: `${S[2]}px 0 0`, maxWidth: 560 }}>
          {tr(
            "Request a higher table or branch limit, report an issue, or ask for a new feature. A real person reads every message and usually replies within a day.",
          )}
        </p>
      </div>

      <div style={card({ pad: S[5] })}>
        <div>
          <label htmlFor="c-subject" style={label}>
            {tr("Subject")}
          </label>
          <input
            id="c-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={tr("e.g. Raise our branch limit")}
            style={field()}
          />
        </div>
        <div style={{ marginTop: S[4] }}>
          <label htmlFor="c-body" style={label}>
            {tr("Message")}
          </label>
          <textarea
            id="c-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            style={{ ...field(), resize: "vertical", lineHeight: 1.5 }}
          />
        </div>

        {error && (
          <div style={{ marginTop: S[4] }}>
            <Alert kind="danger">{error}</Alert>
          </div>
        )}
        {sent && (
          <div style={{ marginTop: S[4] }}>
            <Alert kind="success">{tr("Message sent. We'll get back to you.")}</Alert>
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
            {tr("Send message")}
          </button>
        </div>
      </div>

      <div style={{ marginTop: S[6] }}>
        <div style={{ ...T.h3, color: C.text, marginBottom: S[4] }}>{tr("Your messages")}</div>
        {loading ? (
          <div style={{ display: "grid", gap: S[3] }}>
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} h={84} radius={R.lg} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <EmptyState
            title={tr("No messages yet")}
            body={tr("Anything you send shows up here with its status.")}
          />
        ) : (
          <div style={{ display: "grid", gap: S[3] }}>
            {messages.map((m) => (
              <div key={m.id} style={card({ pad: S[4] })}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: S[3],
                  }}
                >
                  <div style={{ ...T.h3, color: C.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {m.subject}
                  </div>
                  <span style={badge(m.status === "resolved" ? "success" : "warn")}>
                    {m.status === "resolved" ? tr("Resolved") : tr("Open")}
                  </span>
                </div>
                <p style={{ ...T.body, color: C.muted, margin: `${S[2]}px 0 0`, whiteSpace: "pre-wrap" }}>
                  {m.body}
                </p>
                <div style={{ ...T.caption, color: C.faint, marginTop: S[2] }}>
                  {new Date(m.createdAt).toLocaleString()}
                </div>
                {m.reply && (
                  <div
                    style={{
                      marginTop: S[3],
                      padding: S[3],
                      background: C.brandTint,
                      borderRadius: R.md,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <div style={{ ...T.label, color: C.brand, marginBottom: S[1] }}>
                      {tr("Reply from the Nuqra team")}
                      {m.repliedAt ? ` · ${new Date(m.repliedAt).toLocaleString()}` : ""}
                    </div>
                    <p style={{ ...T.body, color: C.text, margin: 0, whiteSpace: "pre-wrap" }}>
                      {m.reply}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
