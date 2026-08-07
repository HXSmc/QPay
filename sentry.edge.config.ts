// Edge runtime Sentry init. Imported by instrumentation.ts when
// process.env.NEXT_RUNTIME === "edge" (middleware runs here). No-op without
// SENTRY_DSN. Same PDPL scrub as the server config.
import * as Sentry from "@sentry/nextjs";
import { beforeSend, TRACES_SAMPLE_RATE } from "./app/lib/sentry-scrub";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: TRACES_SAMPLE_RATE,
    sendDefaultPii: false,
    beforeSend,
  });
}
