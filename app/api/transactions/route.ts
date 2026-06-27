import { NextResponse } from "next/server";
import { authedUser, listTransactions } from "@/app/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await listTransactions(user.id));
}
