import { NextResponse } from "next/server";

// Configure which routes the proxy should run on
export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};

// Helper: list of fallback cookie names if AUTH_COOKIE_NAME isn't set
const FALLBACK_COOKIE_NAMES = ["token", "auth", "session", "connect.sid", "jid"];

function getCookieName() {
  return process.env.AUTH_COOKIE_NAME || FALLBACK_COOKIE_NAMES.find(Boolean);
}

export async function proxy(request) {
  const cookieName = process.env.AUTH_COOKIE_NAME || null;

  // If no explicit cookie name provided, try to detect any cookie header
  const cookieHeader = request.headers.get("cookie") || "";

  // If an explicit cookie name is set, check for that specifically
  if (cookieName) {
    const regexp = new RegExp(`(^|; )${cookieName}=`);
    if (!regexp.test(cookieHeader)) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }
  } else {
    // No explicit name: ensure at least one cookie exists
    if (!cookieHeader || cookieHeader.trim() === "") {
      return NextResponse.redirect(new URL("/auth", request.url));
    }
  }

  // Forward the cookie header to the auth backend to validate the token
  try {
    const res = await fetch("http://localhost:8080/api/me", {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }

    const user = await res.json();

    // Enforce ADMIN role for /admin
    if (request.nextUrl.pathname.startsWith("/admin")) {
      if (!user || user.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    // All good — allow the request to proceed
    return NextResponse.next();
  } catch (e) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }
}
