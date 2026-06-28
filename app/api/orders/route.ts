import { NextResponse } from "next/server";
import { authedUser, listOrders, placeOrder } from "@/app/lib/store";
import { allow, clientIp } from "@/app/lib/ratelimit";

export const dynamic = "force-dynamic";

const MAX_LINES = 40;

// GET → admin: the caller's own orders (optionally active only via ?active=1).
export async function GET(req: Request) {
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const activeOnly = new URL(req.url).searchParams.get("active") === "1";
  return NextResponse.json(await listOrders(user.id, { activeOnly }));
}

// POST → public (customer). The unguessable table `token` is the capability, so
// (like pay/sync) this is token-gated rather than cookie+CSRF. Prices are
// snapshotted server-side from live items — the client sends only id/qty/note.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    token?: unknown;
    lines?: unknown;
  };
  if (typeof body.token !== "string" || !body.token) {
    return NextResponse.json({ error: "invalid token" }, { status: 400 });
  }
  if (!Array.isArray(body.lines) || body.lines.length === 0 || body.lines.length > MAX_LINES) {
    return NextResponse.json({ error: "invalid lines" }, { status: 400 });
  }
  if (!allow(`order|${clientIp(req)}`, 12, 60_000)) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }
  const requested = body.lines.map((l) => {
    const o = (l ?? {}) as Record<string, unknown>;
    return {
      menuItemId: typeof o.menuItemId === "string" ? o.menuItemId : undefined,
      qty: typeof o.qty === "number" ? o.qty : undefined,
      comment: typeof o.comment === "string" ? o.comment : undefined,
    };
  });
  const order = await placeOrder(body.token, requested);
  if (!order) {
    // Either the token didn't resolve or no requested line matched a live item.
    return NextResponse.json({ error: "could not place order" }, { status: 400 });
  }
  // Don't echo the owner id back to the diner.
  const { owner: _o, ...rest } = order;
  void _o;
  return NextResponse.json(rest);
}
