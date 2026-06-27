import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth";
import { getUserById } from "@/app/lib/store";

export const dynamic = "force-dynamic";

// Identity of the signed-in user — drives role-aware UI (sidebar, routing).
export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const user = await getUserById(session.sub);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}
