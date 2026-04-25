// ============================================================
// MATCHPOINT — Auth middleware
// ============================================================
// Gates /dashboard/** and /admin/** routes by checking the signed
// session cookie. Admin routes additionally require role === "admin".
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { decodeSession, SESSION_COOKIE_NAME } from "@/lib/session";

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await decodeSession(token);

  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (request.nextUrl.pathname.startsWith("/admin") && session.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}
