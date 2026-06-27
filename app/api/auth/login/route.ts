import { NextResponse } from "next/server";
import { AUTH_COOKIE, createSessionToken, verifyPassword } from "@/app/lib/auth";
import { findUserByEmail } from "@/app/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";

  const user = email ? await findUserByEmail(email) : null;
  // Always run a verify (against the stored hash, or a dummy) so the response
  // time doesn't reveal whether the email exists.
  const DUMMY =
    "AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY);

  if (!user || !ok) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

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
