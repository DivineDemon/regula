import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import {
  type AlertRuleStatus,
  alerts,
  customAlertRules,
  type targets,
} from "@/lib/db/schema";

export interface CreateCustomRuleParams {
  organizationId: string;
  name: string;
  description?: string;
  status?: AlertRuleStatus;
  conditions?: {
    targetIds?: string[];
    categories?: string[];
    jurisdictions?: string[];
    minImpactScore?: number;
    maxImpactScore?: number;
    keywords?: string[];
    excludeKeywords?: string[];
    changeTypes?: string[];
  };
  actions?: {
    autoStatus?: "new" | "triaged" | "actioned" | "closed";
    autoAssignTo?: string[];
    applyTemplate?: string;
    addTags?: string[];
    notificationChannels?: string[];
    suppressNotification?: boolean;
  };
  priority?: string;
  createdBy?: string;
}

/**
 * Create a custom alert rule
 */
export async function createCustomAlertRule(params: CreateCustomRuleParams) {
  const ruleId = nanoid();
  const [rule] = await db
    .insert(customAlertRules)
    .values({
      id: ruleId,
      organizationId: params.organizationId,
      name: params.name,
      description: params.description,
      status: params.status || "draft",
      conditions: params.conditions ?? {},
      actions: params.actions ?? {},
      priority: params.priority || "normal",
      createdBy: params.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return rule;
}

/**
 * Get all custom rules for an organization
 */
export async function getCustomAlertRules(organizationId: string) {
  return db
    .select()
    .from(customAlertRules)
    .where(eq(customAlertRules.organizationId, organizationId))
    .orderBy(customAlertRules.createdAt);
}

/**
 * Get active custom rules for an organization (ordered by priority)
 */
export async function getActiveCustomAlertRules(organizationId: string) {
  return db
    .select()
    .from(customAlertRules)
    .where(
      and(
        eq(customAlertRules.organizationId, organizationId),
        eq(customAlertRules.status, "active"),
      ),
    )
    .orderBy(customAlertRules.priority);
}

/**
 * Get a rule by ID
 */
export async function getCustomAlertRule(
  ruleId: string,
  organizationId: string,
) {
  const [rule] = await db
    .select()
    .from(customAlertRules)
    .where(
      and(
        eq(customAlertRules.id, ruleId),
        eq(customAlertRules.organizationId, organizationId),
      ),
    )
    .limit(1);

  return rule || null;
}

/**
 * Update a custom alert rule
 */
export async function updateCustomAlertRule(
  ruleId: string,
  organizationId: string,
  params: Partial<CreateCustomRuleParams>,
) {
  const [updated] = await db
    .update(customAlertRules)
    .set({
      ...params,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(customAlertRules.id, ruleId),
        eq(customAlertRules.organizationId, organizationId),
      ),
    )
    .returning();

  return updated || null;
}

/**
 * Delete a custom alert rule
 */
export async function deleteCustomAlertRule(
  ruleId: string,
  _organizationId: string,
) {
  await db.delete(customAlertRules).where(eq(customAlertRules.id, ruleId));

  return true;
}

/**
 * Check if an alert matches a rule's conditions
 */
export async function checkAlertMatchesRule(
  ruleId: string,
  organizationId: string,
  alertData: {
    alert: typeof alerts.$inferSelect;
    target: Pick<
      typeof targets.$inferSelect,
      "id" | "category" | "jurisdiction"
    >;
    summary: string | null;
    impactScore: number | null;
  },
): Promise<boolean> {
  const rule = await getCustomAlertRule(ruleId, organizationId);
  if (!rule || rule.status !== "active" || !rule.conditions) {
    return false;
  }

  const conditions = rule.conditions as CreateCustomRuleParams["conditions"];
  if (!conditions) {
    return false;
  }

  // Check target IDs
  if (conditions.targetIds && conditions.targetIds.length > 0) {
    if (!conditions.targetIds.includes(alertData.target.id)) {
      return false;
    }
  }

  // Check categories
  if (conditions.categories && conditions.categories.length > 0) {
    if (
      !alertData.target.category ||
      !conditions.categories.includes(alertData.target.category)
    ) {
      return false;
    }
  }

  // Check jurisdictions
  if (conditions.jurisdictions && conditions.jurisdictions.length > 0) {
    if (
      !alertData.target.jurisdiction ||
      !conditions.jurisdictions.includes(alertData.target.jurisdiction)
    ) {
      return false;
    }
  }

  // Check impact score
  if (conditions.minImpactScore !== undefined) {
    if (
      !alertData.impactScore ||
      alertData.impactScore < conditions.minImpactScore
    ) {
      return false;
    }
  }

  if (conditions.maxImpactScore !== undefined) {
    if (
      alertData.impactScore !== null &&
      alertData.impactScore > conditions.maxImpactScore
    ) {
      return false;
    }
  }

  // Check keywords
  if (conditions.keywords && conditions.keywords.length > 0) {
    const summary = (alertData.summary || "").toLowerCase();
    const hasAllKeywords = conditions.keywords.every((keyword) =>
      summary.includes(keyword.toLowerCase()),
    );
    if (!hasAllKeywords) return false;
  }

  // Check exclude keywords
  if (conditions.excludeKeywords && conditions.excludeKeywords.length > 0) {
    const summary = (alertData.summary || "").toLowerCase();
    const hasExcludedKeyword = conditions.excludeKeywords.some((keyword) =>
      summary.includes(keyword.toLowerCase()),
    );
    if (hasExcludedKeyword) return false;
  }

  return true;
}

/**
 * Apply rule actions to an alert
 */
export async function applyRuleActions(
  ruleId: string,
  organizationId: string,
  alertId: string,
) {
  const rule = await getCustomAlertRule(ruleId, organizationId);
  if (!rule?.actions) {
    return null;
  }

  const actions = rule.actions as CreateCustomRuleParams["actions"];
  if (!actions) {
    return null;
  }

  const updates: Partial<typeof alerts.$inferInsert> = {};

  // Apply auto status
  if (actions.autoStatus) {
    updates.status = actions.autoStatus;
  }

  // Apply template
  if (actions.applyTemplate) {
    updates.templateId = actions.applyTemplate;
  }

  if (Object.keys(updates).length > 0) {
    const [updated] = await db
      .update(alerts)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(eq(alerts.id, alertId), eq(alerts.organizationId, organizationId)),
      )
      .returning();

    return updated;
  }

  return null;
}
