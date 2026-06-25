import { NextResponse } from "next/server";
import { AUTH_COOKIE, DEMO_EMAIL, DEMO_PASSWORD } from "@/app/lib/auth";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };
  if (body.email === DEMO_EMAIL && body.password === DEMO_PASSWORD) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(AUTH_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return res;
  }
  return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
}
