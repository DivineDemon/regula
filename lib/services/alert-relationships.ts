import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  type AlertRelationshipType,
  alertRelationships,
  alerts,
} from "@/lib/db/schema";

export interface CreateRelationshipParams {
  sourceAlertId: string;
  targetAlertId: string;
  relationshipType: AlertRelationshipType;
  notes?: string;
  createdBy?: string;
}

/**
 * Create a relationship between two alerts
 */
export async function createAlertRelationship(
  organizationId: string,
  params: CreateRelationshipParams,
) {
  // Verify both alerts belong to organization
  const [sourceAlert, targetAlert] = await Promise.all([
    db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.id, params.sourceAlertId),
          eq(alerts.organizationId, organizationId),
        ),
      )
      .limit(1),
    db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.id, params.targetAlertId),
          eq(alerts.organizationId, organizationId),
        ),
      )
      .limit(1),
  ]);

  if (!sourceAlert[0] || !targetAlert[0]) {
    throw new Error("One or both alerts not found or access denied");
  }

  // Prevent self-relationships
  if (params.sourceAlertId === params.targetAlertId) {
    throw new Error("Cannot create relationship between an alert and itself");
  }

  const [relationship] = await db
    .insert(alertRelationships)
    .values({
      sourceAlertId: params.sourceAlertId,
      targetAlertId: params.targetAlertId,
      relationshipType: params.relationshipType,
      notes: params.notes,
      createdBy: params.createdBy,
      createdAt: new Date(),
    })
    .returning();

  return relationship;
}

/**
 * Get all relationships for an alert
 */
export async function getAlertRelationships(
  alertId: string,
  organizationId: string,
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
    return [];
  }

  // Get relationships where this alert is source or target
  const relationships = await db
    .select()
    .from(alertRelationships)
    .where(
      or(
        eq(alertRelationships.sourceAlertId, alertId),
        eq(alertRelationships.targetAlertId, alertId),
      ),
    );

  // Get related alerts
  const relatedAlertIds = new Set<string>();
  relationships.forEach((rel) => {
    if (rel.sourceAlertId === alertId) {
      relatedAlertIds.add(rel.targetAlertId);
    } else {
      relatedAlertIds.add(rel.sourceAlertId);
    }
  });

  if (relatedAlertIds.size === 0) {
    return [];
  }

  const relatedAlerts = await db
    .select()
    .from(alerts)
    .where(
      and(
        eq(alerts.organizationId, organizationId),
        inArray(alerts.id, Array.from(relatedAlertIds)),
      ),
    );

  // Map relationships to include alert data
  return relationships.map((rel) => {
    const relatedAlertId =
      rel.sourceAlertId === alertId ? rel.targetAlertId : rel.sourceAlertId;
    const relatedAlert = relatedAlerts.find((a) => a.id === relatedAlertId);

    return {
      ...rel,
      relatedAlert,
      direction: rel.sourceAlertId === alertId ? "outgoing" : "incoming",
    };
  });
}

/**
 * Delete a relationship
 */
export async function deleteAlertRelationship(
  sourceAlertId: string,
  targetAlertId: string,
  relationshipType: AlertRelationshipType,
  organizationId: string,
) {
  // Verify both alerts belong to organization
  const [sourceAlert, targetAlert] = await Promise.all([
    db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.id, sourceAlertId),
          eq(alerts.organizationId, organizationId),
        ),
      )
      .limit(1),
    db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.id, targetAlertId),
          eq(alerts.organizationId, organizationId),
        ),
      )
      .limit(1),
  ]);

  if (!sourceAlert[0] || !targetAlert[0]) {
    throw new Error("One or both alerts not found or access denied");
  }

  await db
    .delete(alertRelationships)
    .where(
      and(
        eq(alertRelationships.sourceAlertId, sourceAlertId),
        eq(alertRelationships.targetAlertId, targetAlertId),
        eq(alertRelationships.relationshipType, relationshipType),
      ),
    );

  return true;
}
