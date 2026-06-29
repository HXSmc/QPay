import { NextResponse } from "next/server";

// SCAFFOLD ONLY (payplan.md Phase 3). The settlement source of truth.
// When built: read RAW body bytes (await req.text()) and verify the acquirer
// signature BEFORE any DB write; dedupe on event id (webhook_events); on a
// captured charge, clear the table via the existing commit_table_update RPC;
// append refund rows on refund events. Needs the Node runtime for raw body.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "webhook_not_implemented" },
    { status: 501 },
  );
}
