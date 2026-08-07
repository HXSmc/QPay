// Deliberate error route for verifying the Sentry/GlitchTip pipeline end-to-end.
// Inert in prod by default: returns 404 unless SENTRY_DEBUG_ROUTE === "1", so it
// can never be discovered and abused on a live deployment. When enabled, it
// throws a distinctly-tagged error so the event is easy to find in GlitchTip.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  if (process.env.SENTRY_DEBUG_ROUTE !== "1") {
    return new NextResponse(null, { status: 404 });
  }
  // Tagged so the test event is unambiguous in the GlitchTip project stream.
  throw new Error("[nuqra] debug-sentry test error");
}
