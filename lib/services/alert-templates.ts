import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { alertTemplates } from "@/lib/db/schema";

export interface CreateAlertTemplateParams {
  organizationId: string;
  name: string;
  description?: string;
  category?: string;
  jurisdiction?: string;
  config?: {
    minImpactScore?: number;
    requiredKeywords?: string[];
    excludedKeywords?: string[];
    autoStatus?: "new" | "triaged" | "actioned";
    autoAssignTo?: string[];
    notificationChannels?: string[];
  };
  isDefault?: boolean;
}

export interface UpdateAlertTemplateParams {
  name?: string;
  description?: string;
  category?: string;
  jurisdiction?: string;
  config?: CreateAlertTemplateParams["config"];
  isDefault?: boolean;
}

/**
 * Create a new alert template
 */
export async function createAlertTemplate(params: CreateAlertTemplateParams) {
  const templateId = nanoid();
  const [template] = await db
    .insert(alertTemplates)
    .values({
      id: templateId,
      organizationId: params.organizationId,
      name: params.name,
      description: params.description,
      category: params.category,
      jurisdiction: params.jurisdiction,
      config: params.config ?? {},
      isDefault: params.isDefault ? "true" : "false",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return template;
}

/**
 * Get all templates for an organization
 */
export async function getAlertTemplates(organizationId: string) {
  return db
    .select()
    .from(alertTemplates)
    .where(eq(alertTemplates.organizationId, organizationId))
    .orderBy(alertTemplates.createdAt);
}

/**
 * Get a template by ID
 */
export async function getAlertTemplate(
  templateId: string,
  organizationId: string,
) {
  const [template] = await db
    .select()
    .from(alertTemplates)
    .where(
      and(
        eq(alertTemplates.id, templateId),
        eq(alertTemplates.organizationId, organizationId),
      ),
    )
    .limit(1);

  return template || null;
}

/**
 * Update an alert template
 */
export async function updateAlertTemplate(
  templateId: string,
  organizationId: string,
  params: UpdateAlertTemplateParams,
) {
  const [updated] = await db
    .update(alertTemplates)
    .set({
      ...params,
      isDefault:
        params.isDefault !== undefined
          ? params.isDefault
            ? "true"
            : "false"
          : undefined,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(alertTemplates.id, templateId),
        eq(alertTemplates.organizationId, organizationId),
      ),
    )
    .returning();

  return updated || null;
}

/**
 * Delete an alert template
 */
export async function deleteAlertTemplate(
  templateId: string,
  organizationId: string,
) {
  await db
    .delete(alertTemplates)
    .where(
      and(
        eq(alertTemplates.id, templateId),
        eq(alertTemplates.organizationId, organizationId),
      ),
    );

  return true;
}

/**
 * Check if an alert matches a template
 */
export async function checkAlertMatchesTemplate(
  templateId: string,
  organizationId: string,
  alertData: {
    impactScore: number | null;
    summary: string | null;
    category?: string;
    jurisdiction?: string;
  },
): Promise<boolean> {
  const template = await getAlertTemplate(templateId, organizationId);
  if (!template || !template.config) return false;

  const config = template.config as CreateAlertTemplateParams["config"];
  if (!config) {
    return false;
  }

  // Check impact score
  if (config.minImpactScore !== undefined) {
    if (
      !alertData.impactScore ||
      alertData.impactScore < config.minImpactScore
    ) {
      return false;
    }
  }

  // Check category
  if (template.category && alertData.category !== template.category) {
    return false;
  }

  // Check jurisdiction
  if (
    template.jurisdiction &&
    alertData.jurisdiction !== template.jurisdiction
  ) {
    return false;
  }

  // Check required keywords
  if (config.requiredKeywords && config.requiredKeywords.length > 0) {
    const summary = (alertData.summary || "").toLowerCase();
    const hasAllKeywords = config.requiredKeywords.every((keyword) =>
      summary.includes(keyword.toLowerCase()),
    );
    if (!hasAllKeywords) return false;
  }

  // Check excluded keywords
  if (config.excludedKeywords && config.excludedKeywords.length > 0) {
    const summary = (alertData.summary || "").toLowerCase();
    const hasExcludedKeyword = config.excludedKeywords.some((keyword) =>
      summary.includes(keyword.toLowerCase()),
    );
    if (hasExcludedKeyword) return false;
  }

  return true;
}
