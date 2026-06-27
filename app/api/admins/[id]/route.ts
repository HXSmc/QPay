import { NextResponse } from "next/server";
import { authedUser, deleteAdmin } from "@/app/lib/store";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const user = await authedUser(req);
  if (user?.role !== "super") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // deleteAdmin refuses to remove the super account and cascades the admin's
  // tables + receipts.
  const ok = await deleteAdmin(params.id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
