import { NextResponse } from "next/server";
import { authedUser, listTransactions, scopeFor } from "@/app/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Manager → whole-chain ledger; branch-admin → its branch only.
  const scope = scopeFor(user);
  return NextResponse.json(
    await listTransactions(scope.ownerId, { branchId: scope.branchId }),
  );
}
