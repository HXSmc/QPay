import { NextResponse } from "next/server";
import { isSameOrigin } from "@/app/lib/auth";
import {
  authedUser,
  createManagerMessage,
  listManagerMessages,
  listManagerMessagesFor,
} from "@/app/lib/store";
import { clientIp, rateLimit } from "@/app/lib/ratelimit";

export const dynamic = "force-dynamic";

const MAX_SUBJECT = 120;
const MAX_BODY = 4000;

// GET → super: every manager's messages. Manager: only its own. (Branch-admins
// have no contact channel.)
export async function GET(req: Request) {
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (user.role === "super") return NextResponse.json(await listManagerMessages());
  if (user.role === "manager") {
    return NextResponse.json(await listManagerMessagesFor(user.id));
  }
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

// POST → manager sends a message to the super admin.
export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (user.role !== "manager") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!(await rateLimit("contact", clientIp(req)))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    subject?: unknown;
    body?: unknown;
  };
  const subject =
    typeof body.subject === "string" ? body.subject.trim().slice(0, MAX_SUBJECT) : "";
  const message =
    typeof body.body === "string" ? body.body.trim().slice(0, MAX_BODY) : "";
  if (!subject || !message) {
    return NextResponse.json({ error: "subject and message required" }, { status: 400 });
  }
  const created = await createManagerMessage(user.id, subject, message);
  return NextResponse.json(created, { status: 201 });
}
