import { NextResponse } from "next/server";
import { authedUser, createTable, listTables } from "@/app/lib/store";
import { isSameOrigin } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

// The table list is scoped to the calling admin; customers read a single table
// via /api/tables/[num].
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
  return NextResponse.json(await createTable(user.id));
}
