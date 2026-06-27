import { NextResponse } from "next/server";
import { listTransactions } from "@/app/lib/store";
import { getSession } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await listTransactions(session.sub));
}
