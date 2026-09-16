import { NextResponse } from "next/server";
import { authedUser, scopeFor } from "@/app/lib/store";
import { channelName } from "@/app/lib/realtime";

export const dynamic = "force-dynamic";

// GET → the caller's realtime channel names (HMAC digests of their data scope),
// handed out only to authenticated sessions. Null values mean "no realtime"
// (disk dev / missing SESSION_SECRET); clients then use the poll fallback.
export async function GET(req: Request) {
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const scope = scopeFor(user);
  return NextResponse.json({
    orders: channelName("orders", scope.ownerId),
    tables: channelName("tables", scope.ownerId),
  });
}
