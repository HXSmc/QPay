import { NextResponse } from "next/server";
import { authedUser } from "@/app/lib/store";

export const dynamic = "force-dynamic";

// Identity of the signed-in user — drives role-aware UI (sidebar, routing).
export async function GET(req: Request) {
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}
