import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { type WebhookStatus, webhookConfigs } from "@/lib/db/schema";
import { sendWebhook, type WebhookPayload } from "./webhook";

export interface CreateWebhookConfigParams {
  organizationId: string;
  name: string;
  url: string;
  secret?: string;
  eventFilters?: {
    alertStatuses?: string[];
    minImpactScore?: number;
    categories?: string[];
    jurisdictions?: string[];
  };
  maxRetries?: number;
  timeout?: number;
}

/**
 * Create a webhook configuration
 */
export async function createWebhookConfig(params: CreateWebhookConfigParams) {
  const webhookId = nanoid();
  const [webhook] = await db
    .insert(webhookConfigs)
    .values({
      id: webhookId,
      organizationId: params.organizationId,
      name: params.name,
      url: params.url,
      secret: params.secret,
      status: "active",
      eventFilters: params.eventFilters ?? {},
      maxRetries: String(params.maxRetries || 3),
      timeout: String(params.timeout || 10000),
      successCount: "0",
      failureCount: "0",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return webhook;
}

/**
 * Get all webhook configurations for an organization
 */
export async function getWebhookConfigs(organizationId: string) {
  return db
    .select()
    .from(webhookConfigs)
    .where(eq(webhookConfigs.organizationId, organizationId))
    .orderBy(webhookConfigs.createdAt);
}

/**
 * Get a webhook configuration by ID
 */
export async function getWebhookConfig(
  webhookId: string,
  organizationId: string,
) {
  const [webhook] = await db
    .select()
    .from(webhookConfigs)
    .where(
      and(
        eq(webhookConfigs.id, webhookId),
        eq(webhookConfigs.organizationId, organizationId),
      ),
    )
    .limit(1);

  return webhook || null;
}

/**
 * Update a webhook configuration
 */
export async function updateWebhookConfig(
  webhookId: string,
  organizationId: string,
  params: Partial<CreateWebhookConfigParams> & { status?: WebhookStatus },
) {
  const [updated] = await db
    .update(webhookConfigs)
    .set({
      ...params,
      maxRetries: params.maxRetries ? String(params.maxRetries) : undefined,
      timeout: params.timeout ? String(params.timeout) : undefined,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(webhookConfigs.id, webhookId),
        eq(webhookConfigs.organizationId, organizationId),
      ),
    )
    .returning();

  return updated || null;
}

/**
 * Delete a webhook configuration
 */
export async function deleteWebhookConfig(
  webhookId: string,
  _organizationId: string,
) {
  await db.delete(webhookConfigs).where(eq(webhookConfigs.id, webhookId));

  return true;
}

/**
 * Trigger webhook for an alert
 */
export async function triggerWebhookForAlert(
  webhookId: string,
  organizationId: string,
  payload: WebhookPayload,
) {
  const webhook = await getWebhookConfig(webhookId, organizationId);
  if (!webhook || webhook.status !== "active") {
    return null;
  }

  // Check event filters
  const filters =
    webhook.eventFilters as CreateWebhookConfigParams["eventFilters"];
  if (filters) {
    // Check alert status filter
    if (filters.alertStatuses && filters.alertStatuses.length > 0) {
      // This would need to be passed in the payload or fetched
      // For now, we'll skip this check
    }

    // Check impact score filter
    if (filters.minImpactScore !== undefined) {
      if (
        payload.impactScore === null ||
        payload.impactScore < filters.minImpactScore
      ) {
        return null; // Skip this webhook
      }
    }
  }

  // Send webhook
  const result = await sendWebhook({
    url: webhook.url,
    payload,
    secret: webhook.secret || undefined,
    organizationId,
    alertId: payload.alertId,
    maxRetries: Number.parseInt(webhook.maxRetries || "3", 10),
    timeout: Number.parseInt(webhook.timeout || "10000", 10),
  });

  // Update statistics
  const updates: Partial<typeof webhookConfigs.$inferInsert> = {
    lastTriggeredAt: new Date(),
  };

  if (result.success) {
    updates.successCount = String(
      Number.parseInt(webhook.successCount || "0", 10) + 1,
    );
  } else {
    updates.failureCount = String(
      Number.parseInt(webhook.failureCount || "0", 10) + 1,
    );
    // Mark as error if too many failures
    if (Number.parseInt(webhook.failureCount || "0", 10) >= 10) {
      updates.status = "error";
    }
  }

  await db
    .update(webhookConfigs)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(webhookConfigs.id, webhookId));

  return result;
}

/**
 * Trigger all active webhooks for an organization for an alert
 */
export async function triggerAllWebhooksForAlert(
  organizationId: string,
  payload: WebhookPayload,
) {
  const webhooks = await getWebhookConfigs(organizationId);
  const activeWebhooks = webhooks.filter((w) => w.status === "active");

  const results = await Promise.allSettled(
    activeWebhooks.map((webhook) =>
      triggerWebhookForAlert(webhook.id, organizationId, payload),
    ),
  );

  return results;
}
