import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, verifySession } from "@/app/lib/auth";

// Dashboard sections reserved for the chain MANAGER. A branch-admin (role
// `admin`) is scoped to one branch and may only reach its own tables/orders/menu
// /analytics; everything else (branches, POS-bearing settings, team management,
// the super contact channel, chain-wide receipts) is manager-only.
const MANAGER_ONLY = [
  "/admin/branches",
  "/admin/settings",
  "/admin/team",
  "/admin/contact",
  "/admin/transactions",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isLogin = pathname === "/admin/login";
  const isSuperArea = pathname.startsWith("/admin/superadmin");
  const session = await verifySession(req.cookies.get(AUTH_COOKIE)?.value);

  if (!session && !isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  if (session && isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = session.role === "super" ? "/admin/superadmin" : "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }
  // The superadmin console is the only area reserved for the `super` role; a
  // signed-in manager/admin landing here is bounced back to their own dashboard.
  if (session && session.role !== "super" && isSuperArea) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }
  // Keep the super account out of the per-restaurant dashboard pages — its home
  // is the console. (It can still hit those APIs as an owner with no tables.)
  if (
    session &&
    session.role === "super" &&
    !isSuperArea &&
    !isLogin &&
    pathname.startsWith("/admin")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/superadmin";
    url.search = "";
    return NextResponse.redirect(url);
  }
  // A branch-admin may not reach manager-only dashboard sections — bounce to its
  // scoped home. (The API layer independently enforces scope; this is UX.)
  if (
    session &&
    session.role === "admin" &&
    MANAGER_ONLY.some((p) => pathname === p || pathname.startsWith(p + "/"))
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
