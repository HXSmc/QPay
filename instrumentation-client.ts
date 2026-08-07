// Browser/client Sentry init. Next.js 15 runs this once on the client at startup.
// DSN MUST be the NEXT_PUBLIC_ var so it is statically inlined into the client
// bundle (server-only SENTRY_DSN is not visible to the browser). No-op without
// it. Same PDPL scrub as the server/edge configs.
import * as Sentry from "@sentry/nextjs";
import { beforeSend, TRACES_SAMPLE_RATE } from "./app/lib/sentry-scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: TRACES_SAMPLE_RATE,
    sendDefaultPii: false,
    beforeSend,
  });
}
