import { NextResponse } from "next/server";
import { authedUser, createTable, listTables } from "@/app/lib/store";

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
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await createTable(user.id));
}
