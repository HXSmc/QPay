import { NextResponse } from "next/server";
import {
  authedUser,
  createMenuItem,
  getPublicMenuItems,
  listBranches,
  listMenuItems,
  scopeFor,
} from "@/app/lib/store";
import { isSameOrigin } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

const MAX_NAME = 80;
const MAX_DESC = 280;
const MAX_CAT = 40;

// Strip the owner id from item rows before they reach a diner.
function publicItem<T extends { owner: string }>(it: T): Omit<T, "owner"> {
  const { owner: _o, ...rest } = it;
  void _o;
  return rest;
}

// GET ?num=&t=  → public: orderable items for that table's owner (token-gated).
// GET (no token) → admin: the caller's own items.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("t");
  if (token) {
    const items = await getPublicMenuItems(token);
    return NextResponse.json(items.map(publicItem));
  }
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Branch-admin → only its branch's items (+ shared chain items). A manager may
  // scope to one branch via ?branch=<id>, else sees all.
  const scope = scopeFor(user);
  const branchId = scope.branchId ?? new URL(req.url).searchParams.get("branch") ?? null;
  return NextResponse.json(await listMenuItems(scope.ownerId, branchId));
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
  const body = (await req.json().catch(() => ({}))) as {
    name?: unknown;
    price?: unknown;
    category?: unknown;
    description?: unknown;
    branchId?: unknown;
  };
  // Resolve the branch this item belongs to: a branch-admin is pinned to its own
  // branch; a manager may target one of its branches (else a shared chain item).
  let branchId: string | null = null;
  if (scope.role === "admin") {
    branchId = scope.branchId;
  } else if (typeof body.branchId === "string" && body.branchId) {
    const branches = await listBranches(scope.ownerId);
    if (branches.some((b) => b.id === body.branchId)) branchId = body.branchId;
  }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, MAX_NAME) : "";
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const price = typeof body.price === "number" && isFinite(body.price) ? body.price : NaN;
  if (!(price >= 0)) {
    return NextResponse.json({ error: "invalid price" }, { status: 400 });
  }
  const category =
    typeof body.category === "string" ? body.category.trim().slice(0, MAX_CAT) : "";
  const description =
    typeof body.description === "string"
      ? body.description.trim().slice(0, MAX_DESC)
      : "";
  const item = await createMenuItem(
    scope.ownerId,
    {
      name,
      price: +price.toFixed(2),
      category,
      description,
    },
    branchId,
  );
  return NextResponse.json(item);
}
