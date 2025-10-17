import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { guestRegex, isDevelopmentEnvironment } from "./lib/constants";
import { FEATURE_GUEST_ACCOUNTS } from "./lib/feature-flags";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  // Paths that are allowed without authentication (public)
  const openAuthPaths = ["/", "/login", "/register", "/login/form"]; // include landing page

  if (!token) {
    // Allow unauthenticated users to view landing + auth pages.
    if (openAuthPaths.includes(pathname)) {
      return NextResponse.next();
    }
    // For any other protected path, send to login.
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const isGuest = guestRegex.test(token?.email ?? "");

  if (
    token &&
    !isGuest &&
    ["/login", "/register", "/login/form"].includes(pathname)
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If guest accounts are disabled and the user is a guest, force upgrade path.
  if (token && isGuest && !FEATURE_GUEST_ACCOUNTS) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/chat/:id",
    "/api/:path*",
    "/login",
    "/register",

    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
