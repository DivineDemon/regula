import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import type { organizations } from "@/lib/db/schema/organizations";
import type { targets } from "@/lib/db/schema/targets";
import type { DiffMetadata } from "./diff";
import { calculateImpactScoreFromDiff } from "./impact-scoring";
import { type SummarizationResult, summarizeRegulatoryContent } from "./llm";
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
      status: "new",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  if (!alert) {
    throw new Error("Failed to create alert record");
  }

  return {
    id: alert.id,
    summary: alert.summary ?? "",
    impactScore: alert.impactScore ?? 0,
  };
}

/**
 * Get alert by ID
 */
export async function getAlert(alertId: string) {
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
 */
export async function getAlertsByTarget(targetId: string) {
  return db
    .select()
    .from(alerts)
    .where(eq(alerts.targetId, targetId))
    .orderBy(alerts.createdAt);
}
