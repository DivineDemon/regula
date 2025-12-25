import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { alerts, alertTagAssignments, alertTags } from "@/lib/db/schema";

export interface CreateTagParams {
  organizationId: string;
  name: string;
  color?: string;
  description?: string;
}

/**
 * Create a new tag
 */
export async function createTag(params: CreateTagParams) {
  const tagId = nanoid();
  const [tag] = await db
    .insert(alertTags)
    .values({
      id: tagId,
      organizationId: params.organizationId,
      name: params.name,
      color: params.color,
      description: params.description,
      createdAt: new Date(),
    })
    .returning();

  return tag;
}

/**
 * Get all tags for an organization
 */
export async function getTags(organizationId: string) {
  return db
    .select()
    .from(alertTags)
    .where(eq(alertTags.organizationId, organizationId))
    .orderBy(alertTags.name);
}

/**
 * Get a tag by ID
 */
export async function getTag(tagId: string, organizationId: string) {
  const [tag] = await db
    .select()
    .from(alertTags)
    .where(
      and(
        eq(alertTags.id, tagId),
        eq(alertTags.organizationId, organizationId),
      ),
    )
    .limit(1);

  return tag || null;
}

/**
 * Update a tag
 */
export async function updateTag(
  tagId: string,
  organizationId: string,
  params: Partial<CreateTagParams>,
) {
  const [updated] = await db
    .update(alertTags)
    .set(params)
    .where(
      and(
        eq(alertTags.id, tagId),
        eq(alertTags.organizationId, organizationId),
      ),
    )
    .returning();

  return updated || null;
}

/**
 * Delete a tag
 */
export async function deleteTag(tagId: string, organizationId: string) {
  await db
    .delete(alertTags)
    .where(
      and(
        eq(alertTags.id, tagId),
        eq(alertTags.organizationId, organizationId),
      ),
    );

  return true;
}

/**
 * Get tags for an alert
 */
export async function getAlertTags(alertId: string, organizationId: string) {
  // Verify alert belongs to organization
  const [alert] = await db
    .select()
    .from(alerts)
    .where(
      and(eq(alerts.id, alertId), eq(alerts.organizationId, organizationId)),
    )
    .limit(1);

  if (!alert) {
    return [];
  }

  const results = await db
    .select({
      tag: alertTags,
      assignment: alertTagAssignments,
    })
    .from(alertTagAssignments)
    .innerJoin(alertTags, eq(alertTagAssignments.tagId, alertTags.id))
    .where(eq(alertTagAssignments.alertId, alertId));

  return results.map((r) => r.tag);
}

/**
 * Add tags to an alert
 */
export async function addTagsToAlert(
  alertId: string,
  organizationId: string,
  tagIds: string[],
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

  // Verify all tags belong to organization
  if (tagIds.length > 0) {
    const tags = await db
      .select()
      .from(alertTags)
      .where(
        and(
          eq(alertTags.organizationId, organizationId),
          inArray(alertTags.id, tagIds),
        ),
      );

    if (tags.length !== tagIds.length) {
      throw new Error("One or more tags not found");
    }
  }

  // Remove existing assignments
  await db
    .delete(alertTagAssignments)
    .where(eq(alertTagAssignments.alertId, alertId));

  // Add new assignments
  if (tagIds.length > 0) {
    await db.insert(alertTagAssignments).values(
      tagIds.map((tagId) => ({
        alertId,
        tagId,
        assignedAt: new Date(),
      })),
    );
  }

  return true;
}

/**
 * Remove tags from an alert
 */
export async function removeTagsFromAlert(
  alertId: string,
  organizationId: string,
  tagIds: string[],
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

  await db
    .delete(alertTagAssignments)
    .where(
      and(
        eq(alertTagAssignments.alertId, alertId),
        inArray(alertTagAssignments.tagId, tagIds),
      ),
    );

  return true;
}
