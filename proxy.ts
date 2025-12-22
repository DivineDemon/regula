import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getClientIdentifier, rateLimit } from "@/lib/utils/rate-limit";

/**
 * Next.js 16 proxy.ts (replaces middleware.ts)
 * Runs on Node.js runtime and handles request interception
 *
 * Reference: https://nextjs.org/blog/next-16#proxyts-formerly-middlewarets
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip proxy for Next.js internal routes and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks/stripe") ||
    pathname.startsWith("/api/inngest") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/public") ||
    pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next();
  }

  // Rate limiting for API routes
  if (pathname.startsWith("/api")) {
    const identifier = getClientIdentifier(request);
    const endpoint = pathname.replace("/api/", "").replace(/\//g, ":");
    const rateLimitKey = `${identifier}:${endpoint}`;

    // Different rate limits for different endpoints
    let limit = 100; // Default: 100 requests
    let window = 60; // Default: per minute

    // Stricter limits for write operations
    if (
      pathname.includes("/targets") ||
      pathname.includes("/alerts") ||
      pathname.includes("/billing") ||
      pathname.includes("/settings")
    ) {
      limit = 30;
      window = 60;
    }

    // Very strict limits for authentication endpoints
    if (
      pathname.includes("/auth/register") ||
      pathname.includes("/auth/login")
    ) {
      limit = 5;
      window = 60;
    }

    // Very strict limits for password reset
    if (
      pathname.includes("/auth/forgot-password") ||
      pathname.includes("/auth/reset-password")
    ) {
      limit = 3;
      window = 300; // 5 minutes
    }

    const rateLimitResult = await rateLimit(rateLimitKey, { limit, window });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
            "Retry-After": Math.ceil(
              (rateLimitResult.reset - Date.now()) / 1000,
            ).toString(),
          },
        },
      );
    }

    // Add rate limit headers to response
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString());
    response.headers.set(
      "X-RateLimit-Remaining",
      rateLimitResult.remaining.toString(),
    );
    response.headers.set("X-RateLimit-Reset", rateLimitResult.reset.toString());
    return response;
  }

  // Get the auth session for the request (async in NextAuth v5)
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;

  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/verify-email",
    "/check-email",
    "/forgot-password",
    "/reset-password",
    "/legal", // Legal pages (terms, privacy, cookies, etc.)
  ];
  const isPublicRoute =
    pathname === "/" ||
    publicRoutes.some((route) => pathname.startsWith(route));

  // If user is not logged in and trying to access protected route
  if (!isLoggedIn && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is logged in and trying to access auth pages, redirect to dashboard
  if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}
