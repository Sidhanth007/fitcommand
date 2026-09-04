import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic route guard (Next.js 16 "proxy", formerly middleware).
 * Only checks for the presence of the session cookie — the real, database-backed
 * check happens in server layouts/actions via requireUser()/requireAdmin().
 */
const SESSION_COOKIE = "fc_session";

const protectedPrefixes = [
  "/dashboard",
  "/onboarding",
  "/plan",
  "/workouts",
  "/nutrition",
  "/progress",
  "/goals",
  "/assistant",
  "/reminders",
  "/settings",
  "/admin",
  "/learn",
];

const authPages = ["/login", "/register", "/forgot-password"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const isProtected = protectedPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isProtected && !hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && authPages.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
