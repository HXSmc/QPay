import { NextResponse } from "next/server";

// SCAFFOLD ONLY (payplan.md Phase 3). When built: admin cookie + CSRF; issue a
// full/partial refund against a processor_intent_id OWNED by the admin
// (per-owner isolation, cross-owner 404); refund total <= original; reconcile
// via the refund webhook into the ledger.
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "refund_not_implemented" },
    { status: 501 },
  );
}
