import { NextResponse } from "next/server";
import { authedUser, getSettings, setSettings } from "@/app/lib/store";
import { isSameOrigin } from "@/app/lib/auth";
import type { RestaurantSettings } from "@/app/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getSettings(user.id));
}

export async function PUT(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as Partial<RestaurantSettings>;
  // setSettings validates/clamps each field; ignore anything else.
  const next = await setSettings(user.id, {
    name: body.name,
    taxRate: body.taxRate,
    autoReceipts: body.autoReceipts,
    tipPrompts: body.tipPrompts,
  });
  return NextResponse.json(next);
}
