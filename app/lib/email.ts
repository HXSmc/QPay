// Transactional email via Resend's REST API.
//
// Kept provider-thin: one POST to https://api.resend.com/emails. The API key is
// server-only (RESEND_API_KEY) and never reaches the client. `RESEND_FROM` sets
// the sender; until a domain is verified in Resend, real delivery is limited to
// the account-owner address / verified domain, so the default uses Resend's
// shared onboarding sender.
//
// Uses fetch (no SDK dep) so it runs unchanged in Node route handlers.

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "Nuqra <onboarding@resend.dev>";
// Brand color for email headers/buttons. Mirrors C.brand in theme.ts (cyan);
// kept as a local literal so this server template has no client-token import.
const BRAND = "#0E7490";

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface MailResult {
  ok: boolean;
  /** Resend message id on success. */
  id?: string;
  /** Human-readable failure reason (also covers "no API key configured"). */
  error?: string;
}

/**
 * Send one transactional email. Never throws — returns `{ ok }` so callers can
 * decide whether a delivery failure should fail their request.
 */
export async function sendMail(input: MailInput): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { ok: false, error: "email is not configured (RESEND_API_KEY unset)" };
  }
  const from = process.env.RESEND_FROM || DEFAULT_FROM;
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    if (!res.ok) {
      let msg = `${res.status}`;
      try {
        const body = (await res.json()) as { message?: string };
        if (body?.message) msg = body.message;
      } catch {
        /* keep status */
      }
      return { ok: false, error: msg };
    }
    const body = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: body.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

/** Compose + send the trial-admin welcome email (password + login link). */
export async function sendTrialCredentials(opts: {
  to: string;
  password: string;
  loginUrl: string;
  restaurant: string;
  expiresAt: string;
}): Promise<MailResult> {
  const expires = new Date(opts.expiresAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  // Derive the day count from the actual expiry so the copy can't drift from the
  // real TRIAL_DAYS the store applied.
  const days = Math.max(
    1,
    Math.round(
      (new Date(opts.expiresAt).getTime() - Date.now()) / 86_400_000,
    ),
  );
  const subject = "Your Nuqra demo admin login";
  const text = [
    `Welcome to Nuqra${opts.restaurant ? `, ${opts.restaurant}` : ""}!`,
    ``,
    `Your trial admin account is ready. Sign in here:`,
    opts.loginUrl,
    ``,
    `Email:    ${opts.to}`,
    `Password: ${opts.password}`,
    ``,
    `This trial account is valid until ${expires} (${days} days).`,
    `Need more time? Reply and our team can extend it.`,
  ].join("\n");
  const html = `
  <div style="font-family:'Plus Jakarta Sans',-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#0B1221">
    <div style="background:${BRAND};border-radius:16px 16px 0 0;padding:26px 28px">
      <div style="color:#fff;font-size:20px;font-weight:800">Nuqra</div>
    </div>
    <div style="border:1px solid #E2E8F0;border-top:none;border-radius:0 0 16px 16px;padding:28px">
      <h1 style="font-size:20px;margin:0 0 8px">Your trial admin is ready</h1>
      <p style="font-size:14.5px;color:#475569;line-height:1.6;margin:0 0 20px">
        Welcome${opts.restaurant ? `, ${escapeHtml(opts.restaurant)}` : ""}! Use the credentials below to sign in to your Nuqra admin dashboard.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
        <tr><td style="padding:8px 0;font-size:13px;color:#64748B;font-weight:600">Email</td>
            <td style="padding:8px 0;font-size:14px;font-weight:700;text-align:right">${escapeHtml(opts.to)}</td></tr>
        <tr><td style="padding:8px 0;font-size:13px;color:#64748B;font-weight:600;border-top:1px solid #F1F5F9">Password</td>
            <td style="padding:8px 0;font-size:14px;font-weight:700;text-align:right;border-top:1px solid #F1F5F9;font-family:ui-monospace,Menlo,monospace">${escapeHtml(opts.password)}</td></tr>
      </table>
      <a href="${escapeHtml(opts.loginUrl)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;padding:13px 26px;border-radius:12px;font-weight:700;font-size:15px">Sign in to Nuqra</a>
      <p style="font-size:13px;color:#64748B;line-height:1.6;margin:22px 0 0">
        This trial account is valid until <strong>${escapeHtml(expires)}</strong> (${days} days). Need more time? Reply and our team can extend it.
      </p>
    </div>
  </div>`;
  return sendMail({ to: opts.to, subject, html, text });
}

/**
 * Sent when a demo is requested for an email that already has an account. We
 * never auto-renew or re-issue credentials self-service — point them at sales.
 */
export async function sendContactSales(opts: {
  to: string;
  restaurant: string;
  salesEmail: string;
}): Promise<MailResult> {
  const subject = "About your Nuqra demo request";
  const text = [
    `Thanks for your interest in Nuqra${opts.restaurant ? `, ${opts.restaurant}` : ""}.`,
    ``,
    `It looks like this email already has a Nuqra account, so we can't issue a new`,
    `trial automatically. To extend your trial or upgrade, please contact our`,
    `sales team at ${opts.salesEmail} and we'll take great care of you.`,
  ].join("\n");
  const html = `
  <div style="font-family:'Plus Jakarta Sans',-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#0B1221">
    <div style="background:${BRAND};border-radius:16px 16px 0 0;padding:26px 28px">
      <div style="color:#fff;font-size:20px;font-weight:800">Nuqra</div>
    </div>
    <div style="border:1px solid #E2E8F0;border-top:none;border-radius:0 0 16px 16px;padding:28px">
      <h1 style="font-size:20px;margin:0 0 8px">Let's talk about your account</h1>
      <p style="font-size:14.5px;color:#475569;line-height:1.6;margin:0 0 18px">
        Thanks for your interest${opts.restaurant ? `, ${escapeHtml(opts.restaurant)}` : ""}! This email already has a Nuqra account, so we can't issue a new trial automatically.
      </p>
      <p style="font-size:14.5px;color:#475569;line-height:1.6;margin:0 0 20px">
        To extend your trial or upgrade, please reach out to our sales team — we'll take great care of you.
      </p>
      <a href="mailto:${escapeHtml(opts.salesEmail)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;padding:13px 26px;border-radius:12px;font-weight:700;font-size:15px">Contact sales</a>
    </div>
  </div>`;
  return sendMail({ to: opts.to, subject, html, text });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
