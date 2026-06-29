import { NextResponse } from "next/server";
import { authedUser, getSettings, listBranches } from "@/app/lib/store";
import { isSameOrigin } from "@/app/lib/auth";
import { clientIp, rateLimit } from "@/app/lib/ratelimit";
import { verifyPosConnection } from "@/app/lib/integrations/pos";

export const dynamic = "force-dynamic";

// Verify a saved POS connection with a real, read-only call to the POS API.
// Tests the account-level config, or a specific branch when `branchId` is given.
// Secrets are read (decrypted) from the store — never sent by the client.
export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Throttle: this triggers an outbound call to the POS API; cap abuse/egress.
  if (!(await rateLimit("posTest", clientIp(req)))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }
  const body = (await req.json().catch(() => ({}))) as { branchId?: unknown };

  let posSystem = "";
  let config: Record<string, string> = {};
  if (typeof body.branchId === "string" && body.branchId) {
    const branch = (await listBranches(user.id)).find((b) => b.id === body.branchId);
    if (!branch) return NextResponse.json({ error: "not found" }, { status: 404 });
    posSystem = branch.posSystem;
    config = branch.posConfig;
  } else {
    const s = await getSettings(user.id);
    posSystem = s.posSystem ?? "";
    config = s.posConfig ?? {};
  }
  if (!posSystem || posSystem === "none") {
    return NextResponse.json(
      { ok: false, automated: true, message: "Choose a POS system first." },
      { status: 200 },
    );
  }
  const result = await verifyPosConnection(posSystem, config);
  return NextResponse.json(result, { status: 200 });
}
