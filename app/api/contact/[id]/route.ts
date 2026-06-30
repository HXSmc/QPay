import { NextResponse } from "next/server";
import { isSameOrigin } from "@/app/lib/auth";
import { authedUser, setManagerMessageStatus } from "@/app/lib/store";

export const dynamic = "force-dynamic";

// PATCH → super marks a manager message open/resolved.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  const user = await authedUser(req);
  if (user?.role !== "super") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { status?: unknown };
  const status = body.status === "resolved" ? "resolved" : "open";
  const ok = await setManagerMessageStatus(id, status);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
