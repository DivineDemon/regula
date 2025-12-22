import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getClientIdentifier } from "./rate-limit";
import { requireOrganizationAccess } from "./tenant";

/**
 * Get authenticated user from session
 */
export async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

/**
 * Require authentication and return user
 */
export async function requireAuth() {
  return getAuthenticatedUser();
}

/**
 * Require organization access and return user
 */
export async function requireOrgAccess(organizationId: string) {
  const user = await requireAuth();
  await requireOrganizationAccess(user.id, organizationId);
  return user;
}

/**
 * Get client IP from request
 */
export function getClientIp(request: NextRequest | Request): string {
  return getClientIdentifier(request);
}

/**
 * Get user agent from request
 */
export function getUserAgent(request: NextRequest | Request): string {
  return request.headers.get("user-agent") || "unknown";
}

/**
 * Create error response
 */
export function errorResponse(
  message: string,
  status: number = 400,
  details?: unknown,
) {
  const response: { error: string; details?: unknown } = { error: message };
  if (details && typeof details === "object") {
    response.details = details;
  }
  return NextResponse.json(response, { status });
}

/**
 * Create success response
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}
