import { NextResponse } from "next/server";

// SCAFFOLD ONLY (payplan.md Phase 2). Not implemented until the SAMA-licensed
// acquirer + legal clearance are in place. When built: public, token-gated;
// resolve table by `token`; create the acquirer charge/intent with an
// idempotency key + Nuqra commission (acquirer-native split) + the restaurant's
// Destination ID; mada enabled; rate-limited. Nuqra never pools funds.
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "payments_not_implemented" },
    { status: 501 },
  );
}
