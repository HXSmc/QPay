import { NextResponse } from "next/server";
import { AUTH_COOKIE, createSessionToken, verifyPassword } from "@/app/lib/auth";
import {
  clearLoginFailures,
  findUserByEmail,
  isLoginLocked,
  recordLoginFailure,
} from "@/app/lib/store";

export const dynamic = "force-dynamic";

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return (xff?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };
  const email = (typeof body.email === "string" ? body.email : "")
    .trim()
    .toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const key = `${email}|${clientIp(req)}`;

  // Throttle brute-force / credential-stuffing: refuse once locked out.
  if (await isLoginLocked(key)) {
    return NextResponse.json(
      { error: "too many attempts, try again later" },
      { status: 429 },
    );
  }

  const user = email ? await findUserByEmail(email) : null;
  // Always run a verify (against the stored hash, or a dummy) so the response
  // time doesn't reveal whether the email exists.
  const DUMMY =
    "AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY);

  if (!user || !ok) {
    await recordLoginFailure(key);
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  await clearLoginFailures(key);
  const res = NextResponse.json({ ok: true, role: user.role });
  res.cookies.set(AUTH_COOKIE, await createSessionToken(user.id, user.role), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
