import { NextResponse } from "next/server";
import { createTable, listTables } from "@/app/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listTables());
}

export async function POST() {
  return NextResponse.json(await createTable());
}
