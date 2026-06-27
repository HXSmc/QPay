import { NextResponse } from "next/server";
import { listTransactions } from "@/app/lib/store";
import { isAdminRequest } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await listTransactions());
}
