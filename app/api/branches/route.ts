import { NextResponse } from "next/server";
import { authedUser, createBranch, listBranches } from "@/app/lib/store";
import { isSameOrigin } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

// Owner-scoped branch list. Always returns at least the default branch.
export async function GET(req: Request) {
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await listBranches(user.id));
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Trial accounts are capped to a single branch.
  if (user.source === "demo") {
    return NextResponse.json(
      { error: "Multi-branch isn't available on trial accounts." },
      { status: 403 },
    );
  }
  const body = (await req.json().catch(() => ({}))) as { name?: unknown };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "invalid name" }, { status: 400 });
  }
  return NextResponse.json(await createBranch(user.id, name), { status: 201 });
}
