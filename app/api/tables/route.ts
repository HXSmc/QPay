import { NextResponse } from "next/server";
import { createTable, listTables } from "@/app/lib/store";
import { isAdminRequest } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

// The full table list (amounts, statuses) is admin-only; customers read a
// single table via /api/tables/[num].
export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await listTables());
}

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await createTable());
}
