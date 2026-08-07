// Server (Node.js runtime) Sentry init. Imported by instrumentation.ts when
// process.env.NEXT_RUNTIME === "nodejs". The SDK is a complete no-op until
// SENTRY_DSN is set, so prod builds/deploys with no DSN behave exactly as today.
import * as Sentry from "@sentry/nextjs";
import { beforeSend, TRACES_SAMPLE_RATE } from "./app/lib/sentry-scrub";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // GlitchTip is Sentry-protocol compatible — point this at the self-hosted
    // instance once it exists. No auth/api keys beyond the DSN.
    tracesSampleRate: TRACES_SAMPLE_RATE,
    // PDPL: never auto-attach PII. Scrub runs in beforeSend regardless.
    sendDefaultPii: false,
    beforeSend,
  });
}
