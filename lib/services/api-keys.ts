import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { type ApiKeyStatus, apiKeys } from "@/lib/db/schema";

export interface CreateApiKeyParams {
  organizationId: string;
  userId: string;
  name: string;
  scopes?: string[];
  expiresAt?: Date;
}

/**
 * Generate a new API key
 * Returns the full key (only shown once) and the key record
 */
export async function createApiKey(params: CreateApiKeyParams) {
  // Generate a secure random key
  const keyPrefix = nanoid(8); // First 8 chars for identification
  const keySecret = crypto.randomBytes(32).toString("hex"); // 64 char secret
  const fullKey = `regula_${keyPrefix}_${keySecret}`;

  // Hash the full key for storage
  const keyHash = crypto.createHash("sha256").update(fullKey).digest("hex");

  const keyId = keyPrefix;
  const [key] = await db
    .insert(apiKeys)
    .values({
      id: keyId,
      organizationId: params.organizationId,
      userId: params.userId,
      name: params.name,
      keyHash,
      scopes: params.scopes || ["alerts:read", "targets:read"],
      expiresAt: params.expiresAt,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return {
    key: fullKey, // Only returned once - caller must store this
    keyRecord: key,
  };
}

/**
 * Verify an API key
 * Returns the key record if valid, null otherwise
 */
export async function verifyApiKey(
  apiKey: string,
): Promise<typeof apiKeys.$inferSelect | null> {
  // Extract prefix from key
  const parts = apiKey.split("_");
  if (parts.length !== 3 || parts[0] !== "regula") {
    return null;
  }

  const keyPrefix = parts[1];
  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  // Find key by prefix
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.id, keyPrefix))
    .limit(1);

  if (!key) {
    return null;
  }

  // Check if key is active
  if (key.status !== "active") {
    return null;
  }

  // Check if key is expired
  if (key.expiresAt && key.expiresAt < new Date()) {
    // Update status to expired
    await db
      .update(apiKeys)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(apiKeys.id, keyPrefix));
    return null;
  }

  // Verify hash matches
  if (key.keyHash !== keyHash) {
    return null;
  }

  // Update last used timestamp
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    .where(eq(apiKeys.id, keyPrefix));

  return key;
}

/**
 * Get all API keys for an organization
 */
export async function getApiKeys(organizationId: string) {
  return db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.organizationId, organizationId))
    .orderBy(apiKeys.createdAt);
}

/**
 * Get an API key by ID
 */
export async function getApiKey(keyId: string, organizationId: string) {
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(
      and(eq(apiKeys.id, keyId), eq(apiKeys.organizationId, organizationId)),
    )
    .limit(1);

  return key || null;
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string, organizationId: string) {
  const [updated] = await db
    .update(apiKeys)
    .set({ status: "revoked", updatedAt: new Date() })
    .where(
      and(eq(apiKeys.id, keyId), eq(apiKeys.organizationId, organizationId)),
    )
    .returning();

  return updated || null;
}

/**
 * Update API key
 */
export async function updateApiKey(
  keyId: string,
  organizationId: string,
  params: {
    name?: string;
    scopes?: string[];
    expiresAt?: Date | null;
    status?: ApiKeyStatus;
  },
) {
  const [updated] = await db
    .update(apiKeys)
    .set({
      ...params,
      updatedAt: new Date(),
    })
    .where(
      and(eq(apiKeys.id, keyId), eq(apiKeys.organizationId, organizationId)),
    )
    .returning();

  return updated || null;
}

/**
 * Check if API key has required scope
 */
export function hasScope(
  key: typeof apiKeys.$inferSelect,
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
