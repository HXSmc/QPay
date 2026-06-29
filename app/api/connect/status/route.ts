import { NextResponse } from "next/server";

// SCAFFOLD ONLY (payplan.md Phase 1). When built: admin cookie; poll the
// acquirer KYC state and reflect accounts.payouts_enabled in the settings UI.
// Customer pay stays blocked until payouts_enabled = true.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { error: "status_not_implemented" },
    { status: 501 },
  );
}
