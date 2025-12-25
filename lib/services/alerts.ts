import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import {
  alertAssignments,
  alertComments,
  alerts,
  targets,
  users,
  versions,
} from "@/lib/db/schema";
import type { AlertStatus } from "@/lib/db/schema/alerts";
import type { organizations } from "@/lib/db/schema/organizations";
import type { TargetCategory } from "@/lib/db/schema/targets";
import {
  checkAlertMatchesTemplate,
  getAlertTemplates,
} from "./alert-templates";
import { CACHE_KEYS, CACHE_TTL, withCache } from "./cache-helpers";
import {
  checkAlertMatchesRule,
  getActiveCustomAlertRules,
} from "./custom-alert-rules";
import type { DiffMetadata } from "./diff";
import { calculateImpactScoreFromDiff } from "./impact-scoring";
import { type SummarizationResult, summarizeRegulatoryContent } from "./llm";
import { sendRealtimeAlertNotification } from "./notifications";
import { getVersionContent } from "./versions";

/**
 * Generate an alert from detected changes
 */
export async function generateAlert(params: {
  organizationId: string;
  targetId: string;
  currentVersionId: string;
  previousVersionId: string;
  diffMetadata: DiffMetadata;
  target: Pick<
    typeof targets.$inferSelect,
    "id" | "url" | "label" | "jurisdiction" | "category" | "organizationId"
  >;
  organization: Pick<typeof organizations.$inferSelect, "id" | "plan">;
}): Promise<{ id: string; summary: string; impactScore: number }> {
  const {
    organizationId,
    targetId,
    currentVersionId,
    previousVersionId,
    diffMetadata,
    target,
    organization,
  } = params;

  // Step 1: Get content for both versions
  const [currentContent, previousContent] = await Promise.all([
    getVersionContent(currentVersionId, organizationId),
    getVersionContent(previousVersionId, organizationId),
  ]);

  if (!currentContent || !previousContent) {
    throw new Error(
      "Could not retrieve content for one or both versions for alert generation",
    );
  }

  // Step 2: Generate AI summary and classification
  let summarizationResult: SummarizationResult;
  try {
    summarizationResult = await summarizeRegulatoryContent({
      previousContent,
      currentContent,
      targetUrl: target.url,
      targetLabel: target.label,
      jurisdiction: target.jurisdiction ?? undefined,
      category: target.category ?? undefined,
      diffMetadata: {
        changeTypes: diffMetadata.changeTypes,
        affectedSections: diffMetadata.affectedSections,
        structuralChanges: diffMetadata.structuralChanges,
      },
    });
  } catch (error) {
    console.error("Error generating summary for alert:", error);
    // Use a fallback summary if AI summarization fails
    const fallbackCategory: SummarizationResult["category"] =
      (target.category as SummarizationResult["category"]) ?? "other";
    summarizationResult = {
      summary: `Changes detected in ${target.label}. Please review the content manually.`,
      keyPoints: ["Content changes detected", "Manual review recommended"],
      category: fallbackCategory,
      entities: {
        dates: [],
        fines: [],
        statuteIds: [],
        jurisdictions: target.jurisdiction ? [target.jurisdiction] : [],
      },
      classification: {
        category: fallbackCategory,
        confidence: 0.5,
        reasoning: "Fallback classification due to summarization error",
      },
    };
  }

  // Step 3: Calculate impact score
  const impactScore = calculateImpactScoreFromDiff({
    diffMetadata,
    regulatoryCategory: summarizationResult.category,
    jurisdiction: target.jurisdiction ?? undefined,
    organizationPlan: organization.plan,
    entities: {
      fines: summarizationResult.entities.fines,
      deadlines: summarizationResult.entities.deadlines,
    },
  });

  // Step 3.5: Check custom alert rules and templates
  let templateId: string | undefined;
  let initialStatus: AlertStatus = "new";
  let autoAssignTo: string[] | undefined;

  // Check custom alert rules
  const customRules = await getActiveCustomAlertRules(organizationId);
  for (const rule of customRules) {
    const matches = await checkAlertMatchesRule(rule.id, organizationId, {
      alert: {} as typeof alerts.$inferSelect, // Will be created below
      target,
      summary: summarizationResult.summary,
      impactScore: impactScore.numericScore,
    });

    if (matches && rule.actions) {
      const actions = rule.actions as {
        autoStatus?: AlertStatus;
        autoAssignTo?: string[];
        applyTemplate?: string;
        addTags?: string[];
      };

      if (actions.autoStatus) {
        initialStatus = actions.autoStatus;
      }
      if (actions.autoAssignTo) {
        autoAssignTo = actions.autoAssignTo;
      }
      if (actions.applyTemplate) {
        templateId = actions.applyTemplate;
      }
    }
  }

  // Check templates if no template was set by rules
  if (!templateId) {
    const templates = await withCache(
      CACHE_KEYS.alertTemplates(organizationId),
      CACHE_TTL.alertTemplates,
      () => getAlertTemplates(organizationId),
    );

    for (const template of templates) {
      const matches = await checkAlertMatchesTemplate(
        template.id,
        organizationId,
        {
          impactScore: impactScore.numericScore,
          summary: summarizationResult.summary,
          category: target.category ?? undefined,
          jurisdiction: target.jurisdiction ?? undefined,
        },
      );

      if (matches) {
        templateId = template.id;
        const config = template.config as {
          autoStatus?: AlertStatus;
          autoAssignTo?: string[];
        };
        if (config.autoStatus && initialStatus === "new") {
          initialStatus = config.autoStatus;
        }
        if (config.autoAssignTo && !autoAssignTo) {
          autoAssignTo = config.autoAssignTo;
        }
        break; // Use first matching template
      }
    }
  }

  // Step 4: Create alert record in database
  const alertId = nanoid();
  const [alert] = await db
    .insert(alerts)
    .values({
      id: alertId,
      organizationId,
      targetId,
      versionId: currentVersionId,
      summary: summarizationResult.summary,
      impactScore: impactScore.numericScore,
      status: initialStatus,
      templateId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  if (!alert) {
    throw new Error("Failed to create alert record");
  }

  // Auto-assign if configured
  if (autoAssignTo && autoAssignTo.length > 0) {
    await assignAlertToUsers(alertId, organizationId, autoAssignTo).catch(
      (error) => {
        console.error("Error auto-assigning alert:", error);
      },
    );
  }

  // Step 5: Send real-time notifications (fire and forget)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const alertUrl = `${baseUrl}/alerts/${alert.id}?organizationId=${organizationId}`;

  sendRealtimeAlertNotification({
    alertId: alert.id,
    organizationId,
    targetLabel: target.label,
    summary: alert.summary ?? "",
    impactScore: alert.impactScore ?? null,
    alertUrl,
  }).catch((error) => {
    console.error("Error sending real-time alert notifications:", error);
    // Don't throw - notification failures shouldn't break alert creation
  });

  return {
    id: alert.id,
    summary: alert.summary ?? "",
    impactScore: alert.impactScore ?? 0,
  };
}

/**
 * Get alert by ID with organizationId verification
 */
export async function getAlert(alertId: string, organizationId?: string) {
  if (organizationId) {
    const [alert] = await db
      .select()
      .from(alerts)
      .where(
        and(eq(alerts.id, alertId), eq(alerts.organizationId, organizationId)),
      )
      .limit(1);

    return alert || null;
  }

  // Fallback for internal use (without org check)
  const [alert] = await db
    .select()
    .from(alerts)
    .where(eq(alerts.id, alertId))
    .limit(1);

  return alert || null;
}

/**
 * Get all alerts for an organization
 */
export async function getAlertsByOrganization(organizationId: string) {
  return db
    .select()
    .from(alerts)
    .where(eq(alerts.organizationId, organizationId))
    .orderBy(alerts.createdAt);
}

/**
 * Get alerts for a specific target
 * Verifies organizationId through target relationship
 */
export async function getAlertsByTarget(
  targetId: string,
  organizationId: string,
) {
  return db
    .select()
    .from(alerts)
    .where(
      and(
        eq(alerts.targetId, targetId),
        eq(alerts.organizationId, organizationId),
      ),
    )
    .orderBy(desc(alerts.createdAt));
}

/**
 * Get alert with related data (target, version, assignments, comments)
 */
export async function getAlertWithDetails(
  alertId: string,
  organizationId: string,
) {
  const [alertData] = await db
    .select({
      alert: alerts,
      target: targets,
      version: versions,
    })
    .from(alerts)
    .innerJoin(targets, eq(alerts.targetId, targets.id))
    .innerJoin(versions, eq(alerts.versionId, versions.id))
    .where(
      and(eq(alerts.id, alertId), eq(alerts.organizationId, organizationId)),
    )
    .limit(1);

  if (!alertData) {
    return null;
  }

  // Get assignments
  const assignments = await db
    .select({
      assignment: alertAssignments,
      user: users,
    })
    .from(alertAssignments)
    .innerJoin(users, eq(alertAssignments.userId, users.id))
    .where(eq(alertAssignments.alertId, alertId));

  // Get comments
  const comments = await db
    .select({
      comment: alertComments,
      user: users,
    })
    .from(alertComments)
    .innerJoin(users, eq(alertComments.userId, users.id))
    .where(eq(alertComments.alertId, alertId))
    .orderBy(desc(alertComments.createdAt));

  return {
    ...alertData,
    assignments: assignments.map((a) => ({
      ...a.assignment,
      user: a.user,
    })),
    comments: comments.map((c) => ({
      ...c.comment,
      user: c.user,
    })),
  };
}

/**
 * Get alerts with filtering and search
 */
export async function getAlertsWithFilters(params: {
  organizationId: string;
  status?: AlertStatus;
  severity?: "low" | "medium" | "high";
  jurisdiction?: string;
  category?: TargetCategory;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const {
    organizationId,
    status,
    severity,
    jurisdiction,
    category,
    dateFrom,
    dateTo,
    search,
    limit = 100,
    offset = 0,
  } = params;

  const conditions = [eq(alerts.organizationId, organizationId)];

  if (status) {
    conditions.push(eq(alerts.status, status));
  }

  if (severity) {
    if (severity === "low") {
      const condition = and(
        gte(alerts.impactScore, 0),
        lte(alerts.impactScore, 0.4),
      );
      if (condition) conditions.push(condition);
    } else if (severity === "medium") {
      const condition = and(
        gte(alerts.impactScore, 0.4),
        lte(alerts.impactScore, 0.7),
      );
      if (condition) conditions.push(condition);
    } else if (severity === "high") {
      const condition = gte(alerts.impactScore, 0.7);
      if (condition) conditions.push(condition);
    }
  }

  if (dateFrom) {
    conditions.push(gte(alerts.createdAt, dateFrom));
  }

  if (dateTo) {
    conditions.push(lte(alerts.createdAt, dateTo));
  }

  if (search) {
    const condition = or(
      ilike(alerts.summary, `%${search}%`),
      ilike(targets.label, `%${search}%`),
      ilike(targets.jurisdiction, `%${search}%`),
    );
    if (condition) conditions.push(condition);
  }

  if (jurisdiction) {
    conditions.push(eq(targets.jurisdiction, jurisdiction));
  }

  if (category) {
    conditions.push(eq(targets.category, category));
  }

  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

  const results = await db
    .select({
      alert: alerts,
      target: targets,
    })
    .from(alerts)
    .innerJoin(targets, eq(alerts.targetId, targets.id))
    .where(whereCondition)
    .orderBy(desc(alerts.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(alerts)
    .innerJoin(targets, eq(alerts.targetId, targets.id))
    .where(whereCondition);

  return {
    alerts: results,
    total: Number(countResult?.count ?? 0),
  };
}

/**
 * Update alert status
 */
export async function updateAlertStatus(
  alertId: string,
  organizationId: string,
  status: AlertStatus,
) {
  const [updated] = await db
    .update(alerts)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(
      and(eq(alerts.id, alertId), eq(alerts.organizationId, organizationId)),
    )
    .returning();

  return updated || null;
}

/**
 * Assign alert to user(s)
 */
export async function assignAlertToUsers(
  alertId: string,
  organizationId: string,
  userIds: string[],
) {
  // Verify alert belongs to organization
  const [alert] = await db
    .select()
    .from(alerts)
    .where(
      and(eq(alerts.id, alertId), eq(alerts.organizationId, organizationId)),
    )
    .limit(1);

  if (!alert) {
    throw new Error("Alert not found or access denied");
  }

  // Remove existing assignments
  await db
    .delete(alertAssignments)
    .where(eq(alertAssignments.alertId, alertId));

  // Add new assignments
  if (userIds.length > 0) {
    await db.insert(alertAssignments).values(
      userIds.map((userId) => ({
        alertId,
        userId,
        assignedAt: new Date(),
      })),
    );
  }

  return true;
}

/**
 * Add comment to alert
 */
export async function addAlertComment(
  alertId: string,
  organizationId: string,
  userId: string,
  content: string,
) {
  // Verify alert belongs to organization
  const [alert] = await db
    .select()
    .from(alerts)
    .where(
      and(eq(alerts.id, alertId), eq(alerts.organizationId, organizationId)),
    )
    .limit(1);

  if (!alert) {
    throw new Error("Alert not found or access denied");
  }

  const commentId = nanoid();
  const [comment] = await db
    .insert(alertComments)
    .values({
      id: commentId,
      alertId,
      userId,
      content,
      createdAt: new Date(),
    })
    .returning();

  return comment;
}

/**
 * Get unique jurisdictions for alerts in an organization
 */
export async function getAlertJurisdictions(organizationId: string) {
  const results = await db
    .selectDistinct({ jurisdiction: targets.jurisdiction })
    .from(alerts)
    .innerJoin(targets, eq(alerts.targetId, targets.id))
    .where(
      and(
        eq(alerts.organizationId, organizationId),
        sql`${targets.jurisdiction} IS NOT NULL`,
      ),
    );

  return results
    .map((r) => r.jurisdiction)
    .filter((j): j is string => j !== null);
}
