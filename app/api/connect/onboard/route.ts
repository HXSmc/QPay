import { NextResponse } from "next/server";

// SCAFFOLD ONLY (payplan.md Phase 1). When built: admin cookie + CSRF; create
// the restaurant's acquirer sub-merchant + KYC (legal name, Saudi IBAN, CR),
// store the Destination ID + masked IBAN last-4 on accounts (IBAN itself is
// processor-of-record where possible; encrypted if stored - payplan §3.1);
// return the onboarding link; email it via Resend.
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "onboarding_not_implemented" },
    { status: 501 },
  );
}
