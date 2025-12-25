import type { NextRequest } from "next/server";
import { verifyApiKey } from "@/lib/services/api-keys";

/**
 * Authenticate request using API key
 * Returns the API key record if valid, null otherwise
 */
export async function authenticateApiKey(
  request: NextRequest,
): Promise<
  typeof import("@/lib/db/schema/api-keys").apiKeys.$inferSelect | null
> {
  const apiKey =
    request.headers.get("X-API-Key") ||
    request.headers.get("Authorization")?.replace("Bearer ", "");

  if (!apiKey) {
    return null;
  }

  // Verify API key
  const keyRecord = await verifyApiKey(apiKey);
  return keyRecord;
}

/**
 * Check if API key has required scope
 */
export function checkApiKeyScope(
  key: typeof import("@/lib/db/schema/api-keys").apiKeys.$inferSelect,
  requiredScope: string,
): boolean {
  if (!key.scopes || key.scopes.length === 0) {
    return false;
  }

  // Check for exact match or wildcard
  return (
    key.scopes.includes(requiredScope) ||
    key.scopes.includes("*") ||
    key.scopes.some((scope) => {
      // Support prefix matching (e.g., "alerts:*" matches "alerts:read")
      const [prefix] = scope.split(":");
      const [requiredPrefix] = requiredScope.split(":");
      return (
        prefix === "*" || (prefix === requiredPrefix && scope.endsWith("*"))
      );
    })
  );
}
