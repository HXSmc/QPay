import { NextResponse } from "next/server";
import { createTable, listTables } from "@/app/lib/store";
import { AUTH_COOKIE } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

function isAdmin(req: Request): boolean {
  const cookie = req.headers.get("cookie") ?? "";
  return cookie.split(/;\s*/).includes(`${AUTH_COOKIE}=1`);
}

export async function GET() {
  return NextResponse.json(await listTables());
}

export async function POST(req: Request) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await createTable());
}
