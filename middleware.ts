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

// Legacy/preview hosts that must permanently redirect to the canonical domain.
// Other hosts (preview deployments, localhost) are left alone on purpose.
const CANONICAL_HOST = "nuqra.org";
const REDIRECT_HOSTS = new Set([
  "qpay-cyan.vercel.app",
  "qpay-hxsmcs-projects.vercel.app",
  "qpay-git-main-hxsmcs-projects.vercel.app",
  "www.nuqra.org",
]);

// Marketing pages that exist in both the default (English) tree and under an
// /ar prefix (Arabic). Anything else under /ar (e.g. /ar/admin) has no Arabic
// build and just bounces to the real path.
const MARKETING_PATHS = new Set(["/", "/demo", "/contact", "/privacy", "/terms"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host");

  // Canonical-domain redirect applies to every matched request, admin included,
  // so preview/legacy hosts never serve pages under the wrong domain.
  if (host && REDIRECT_HOSTS.has(host)) {
    const url = new URL(pathname + req.nextUrl.search, `https://${CANONICAL_HOST}`);
    return NextResponse.redirect(url, 308);
  }

  // x-locale/x-pathname are trusted signals getServerLocale()/generateMetadata()
  // read to pick locale + build canonical URLs — strip any client-supplied copy
  // up front so a forged request header can never spoof them; only this
  // middleware may set them below.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete("x-locale");
  requestHeaders.delete("x-pathname");

  // Arabic locale prefix: /ar and /ar/{marketing page} rewrite to the
  // un-prefixed path, stamping x-locale/x-pathname headers for
  // getServerLocale() and generateMetadata() to read.
  if (pathname === "/ar" || pathname.startsWith("/ar/")) {
    const bare = pathname === "/ar" ? "/" : pathname.slice(3);
    if (MARKETING_PATHS.has(bare)) {
      const url = req.nextUrl.clone();
      url.pathname = bare;
      requestHeaders.set("x-locale", "ar");
      requestHeaders.set("x-pathname", pathname);
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }
    const url = req.nextUrl.clone();
    url.pathname = bare;
    return NextResponse.redirect(url, 308);
  }

  // Non-Arabic marketing pages: stamp x-pathname only. Locale is left to the
  // cookie (getServerLocale()'s existing fallback) — x-locale stays stripped.
  if (MARKETING_PATHS.has(pathname)) {
    requestHeaders.set("x-pathname", pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ---- existing admin auth logic, unchanged ----
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
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/", "/demo", "/contact", "/privacy", "/terms", "/ar", "/ar/:path*", "/admin/:path*"],
};
