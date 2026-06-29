import { NextResponse } from "next/server";
import { authedUser, createTable, listBranches, listTables, tableCap } from "@/app/lib/store";
import { isSameOrigin } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

// The table list is scoped to the calling admin; customers read a single table
// via /api/tables/[num]. Tables carry a branchId; the client filters per branch.
export async function GET(req: Request) {
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await listTables(user.id));
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Enforce the overall table cap (across all branches) from Settings. 0 = off.
  const cap = await tableCap(user.id);
  if (cap > 0) {
    const existing = await listTables(user.id);
    if (existing.length >= cap) {
      return NextResponse.json(
        { error: `Table limit reached (${cap}). Raise it in Settings.` },
        { status: 409 },
      );
    }
  }
  const body = (await req.json().catch(() => ({}))) as { branchId?: unknown };
  let branchId: string | null = null;
  if (typeof body.branchId === "string" && body.branchId) {
    // Only accept a branch the caller actually owns; otherwise leave unassigned.
    const branches = await listBranches(user.id);
    if (branches.some((b) => b.id === body.branchId)) branchId = body.branchId;
  }
  return NextResponse.json(await createTable(user.id, branchId));
}
