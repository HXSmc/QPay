import { NextResponse } from "next/server";
import { authedUser, branchCap, createBranch, listBranches, scopeFor } from "@/app/lib/store";
import { isSameOrigin } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

// Branch list. A manager sees all of its branches; a branch-admin sees only the
// single branch it manages (so its menu/branch selectors resolve a name).
export async function GET(req: Request) {
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const scope = scopeFor(user);
  const all = await listBranches(scope.ownerId);
  if (scope.role === "admin") {
    // A branch-admin gets only its own branch, and NEVER the decrypted POS config
    // (listBranches returns posConfig in cleartext) — POS is manager-only. Return
    // a non-secret projection so a name/selector still resolves.
    return NextResponse.json(
      all
        .filter((b) => b.id === scope.branchId)
        .map((b) => ({ id: b.id, owner: b.owner, name: b.name, createdAt: b.createdAt })),
    );
  }
  return NextResponse.json(all);
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Adding branches is a chain-owner (manager) action, never a branch-admin's.
  if (user.role === "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  // Trial accounts are capped to a single branch.
  if (user.source === "demo") {
    return NextResponse.json(
      { error: "Multi-branch isn't available on trial accounts." },
      { status: 403 },
    );
  }
  // Enforce the branch cap (maxBranches, super-set). 0 = unlimited.
  const cap = await branchCap(user.id);
  if (cap > 0) {
    const existing = await listBranches(user.id);
    if (existing.length >= cap) {
      return NextResponse.json(
        { error: `Branch limit reached (${cap}). Ask your administrator to raise it.` },
        { status: 409 },
      );
    }
  }
  const body = (await req.json().catch(() => ({}))) as { name?: unknown };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "invalid name" }, { status: 400 });
  }
  return NextResponse.json(await createBranch(user.id, name), { status: 201 });
}
