import { NextResponse } from "next/server";
import { isSameOrigin } from "@/app/lib/auth";
import {
  authedUser,
  replyManagerMessage,
  setManagerMessageStatus,
} from "@/app/lib/store";
import { sendManagerReply } from "@/app/lib/email";
import { SITE } from "@/app/lib/site";

export const dynamic = "force-dynamic";

const MAX_REPLY = 4000;

// PATCH → super replies to a manager message (emails the owner), or toggles its
// open/resolved status. Super only.
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
  const body = (await req.json().catch(() => ({}))) as {
    status?: unknown;
    reply?: unknown;
  };

  // Reply path: store the reply, mark resolved, and email the owner.
  if (typeof body.reply === "string" && body.reply.trim()) {
    const reply = body.reply.trim().slice(0, MAX_REPLY);
    const msg = await replyManagerMessage(id, reply);
    if (!msg) return NextResponse.json({ error: "not found" }, { status: 404 });
    let emailed = false;
    if (msg.managerEmail) {
      const mail = await sendManagerReply({
        to: msg.managerEmail,
        subject: msg.subject || "your message",
        reply,
        loginUrl: `${SITE.appUrl}/admin/contact`,
      });
      emailed = mail.ok;
    }
    return NextResponse.json({ ok: true, emailed, message: msg });
  }

  // Status toggle.
  const status = body.status === "resolved" ? "resolved" : "open";
  const ok = await setManagerMessageStatus(id, status);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
