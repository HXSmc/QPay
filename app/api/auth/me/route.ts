import { NextResponse } from "next/server";
import { authedUser, listBranches } from "@/app/lib/store";

export const dynamic = "force-dynamic";

// Identity of the signed-in user — drives role-aware UI (sidebar, routing). For a
// branch-admin, also surface its branch (id + name) so the scoped dashboard can
// label which branch it's operating.
export async function GET(req: Request) {
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let branchName: string | null = null;
  if (user.role === "admin" && user.parentId && user.branchId) {
    const branch = (await listBranches(user.parentId)).find(
      (b) => b.id === user.branchId,
    );
    branchName = branch?.name ?? null;
  }
  return NextResponse.json({
    id: user.id,
    email: user.email,
    role: user.role,
    branchId: user.branchId ?? null,
    branchName,
  });
}
