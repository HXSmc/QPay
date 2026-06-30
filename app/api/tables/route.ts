import { NextResponse } from "next/server";
import { authedUser, createTable, listBranches, listTables, scopeFor, tableCap } from "@/app/lib/store";
import { isSameOrigin } from "@/app/lib/auth";
import { rateLimit } from "@/app/lib/ratelimit";

export const dynamic = "force-dynamic";

// The table list is scoped to the calling account: a manager sees the whole
// chain; a branch-admin sees only its own branch. Customers read a single table
// via /api/tables/[num].
export async function GET(req: Request) {
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const scope = scopeFor(user);
  return NextResponse.json(
    await listTables(scope.ownerId, scope.branchId ? { branchId: scope.branchId } : {}),
  );
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const scope = scopeFor(user);
  // Throttle the insert per owner (consistent with the other authed writes) so a
  // cheaply-obtained trial can't mass-create rows even when no cap is set.
  if (!(await rateLimit("tableCreate", scope.ownerId))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }
  // Enforce the overall table cap (across all branches) from Settings. 0 = off.
  const cap = await tableCap(scope.ownerId);
  if (cap > 0) {
    const existing = await listTables(scope.ownerId);
    if (existing.length >= cap) {
      return NextResponse.json(
        { error: `Table limit reached (${cap}). Raise it in Settings.` },
        { status: 409 },
      );
    }
  }
  const body = (await req.json().catch(() => ({}))) as { branchId?: unknown };
  let branchId: string | null = null;
  if (scope.role === "admin") {
    // A branch-admin can only ever create tables in its OWN branch.
    branchId = scope.branchId;
  } else if (typeof body.branchId === "string" && body.branchId) {
    // Manager: only accept a branch it actually owns; else leave unassigned.
    const branches = await listBranches(scope.ownerId);
    if (branches.some((b) => b.id === body.branchId)) branchId = body.branchId;
  }
  return NextResponse.json(await createTable(scope.ownerId, branchId));
}
