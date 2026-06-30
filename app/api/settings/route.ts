import { NextResponse } from "next/server";
import { authedUser, getSettings, scopeFor, setSettings } from "@/app/lib/store";
import { isSameOrigin } from "@/app/lib/auth";
import type { RestaurantSettings } from "@/app/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const s = await getSettings(scopeFor(user).ownerId);
  // A branch-admin reads its MANAGER's settings only for display (currency/tax).
  // It must NEVER receive the chain's POS config — getSettings returns it
  // DECRYPTED, so strip every secret field to a non-secret display projection.
  if (user.role === "admin") {
    return NextResponse.json({
      name: s.name,
      taxRate: s.taxRate,
      currency: s.currency,
      autoReceipts: s.autoReceipts,
      tipPrompts: s.tipPrompts,
    });
  }
  return NextResponse.json(s);
}

export async function PUT(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Settings (name, tax, currency, POS, counts) belong to the chain — only a
  // manager (or super acting as owner) may write them, never a branch-admin.
  if (user.role === "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as Partial<RestaurantSettings>;
  // Trials are capped to a single branch (multi-branch is paid) — UNLESS the super
  // explicitly granted this account a higher maxBranches, in which case respect it
  // (mergeSettings clamps to that cap). Without the guard, a trial's own settings
  // save would reset super-granted branches back to 1 and orphan provisioned rows.
  const cur = await getSettings(user.id);
  const hasGrantedCap = !!(cur.maxBranches && cur.maxBranches > 0);
  const branches =
    user.source === "demo" && !hasGrantedCap && body.branches !== undefined
      ? Math.min(body.branches, 1)
      : body.branches;
  // setSettings (via mergeSettings) validates/clamps each field; ignore anything
  // else. POS config is sanitized server-side to the chosen system's fields.
  const next = await setSettings(user.id, {
    name: body.name,
    taxRate: body.taxRate,
    currency: body.currency,
    autoReceipts: body.autoReceipts,
    tipPrompts: body.tipPrompts,
    tables: body.tables,
    branches,
    posSystem: body.posSystem,
    posConfig:
      body.posConfig && typeof body.posConfig === "object" ? body.posConfig : undefined,
  });
  return NextResponse.json(next);
}
