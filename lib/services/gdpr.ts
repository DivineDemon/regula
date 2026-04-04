import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import {
  alertAssignments,
  alertComments,
  alerts,
  apiKeys,
  auditLogs,
  type GDPRRequestStatus,
  type GDPRRequestType,
  gdprRequests,
  notificationPreferences,
  organizationMembers,
  organizations,
  targets,
  userConsents,
  users,
  versions,
  webhookConfigs,
} from "@/lib/db/schema";
import { createAuditLog } from "./audit";

/**
 * GDPR service for handling data deletion and export requests
 */
export const gdprService = {
  /**
   * Create a GDPR request (deletion or export)
   */
  async createRequest({
    userId,
    organizationId,
    requestType,
  }: {
    userId: string;
    organizationId: string;
    requestType: GDPRRequestType;
  }): Promise<string> {
    const requestId = nanoid();

    await db.insert(gdprRequests).values({
      id: requestId,
      userId,
      organizationId,
      requestType,
      status: "pending",
    });

    await createAuditLog({
      organizationId,
      userId,
      action:
        requestType === "deletion"
          ? "gdpr_request_deletion"
          : "gdpr_request_export",
      metadata: { requestId },
    });

    return requestId;
  },

  /**
   * Export all user data for GDPR compliance
   */
  async exportUserData(
    userId: string,
    organizationId: string,
  ): Promise<{
    user: unknown;
    organization: unknown;
    membership: unknown | null;
    targets: unknown[];
    versions: unknown[];
    alerts: unknown[];
    alertAssignments: unknown[];
    alertComments: unknown[];
    apiKeys: unknown[];
    notificationPreferences: unknown[];
    webhookConfigs: unknown[];
    auditLogs: unknown[];
    gdprRequests: unknown[];
    userConsents: unknown[];
  }> {
    // Get user data
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      throw new Error("Organization not found");
    }

    const [membership] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.organizationId, organizationId),
        ),
      )
      .limit(1);

    // Get targets for the specific organization
    const orgTargets = await db
      .select()
      .from(targets)
      .where(eq(targets.organizationId, organizationId));

    const targetIds = orgTargets.map((t) => t.id);

    // Get versions for these targets
    const orgVersions =
      targetIds.length > 0
        ? await db
            .select()
            .from(versions)
            .where(inArray(versions.targetId, targetIds))
        : [];

    const versionIds = orgVersions.map((v) => v.id);

    // Get alerts for these versions
    const orgAlerts =
      versionIds.length > 0
        ? await db
            .select()
            .from(alerts)
            .where(inArray(alerts.versionId, versionIds))
        : [];

    // Get alert assignments
    const alertIds = orgAlerts.map((a) => a.id);
    const assignments =
      alertIds.length > 0
        ? await db
            .select()
            .from(alertAssignments)
            .where(inArray(alertAssignments.alertId, alertIds))
        : [];

    // Get alert comments
    const comments =
      alertIds.length > 0
        ? await db
            .select()
            .from(alertComments)
            .where(inArray(alertComments.alertId, alertIds))
        : [];

    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.organizationId, organizationId),
          eq(notificationPreferences.userId, userId),
        ),
      );

    const keys = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.organizationId, organizationId),
          eq(apiKeys.userId, userId),
        ),
      );

    const hooks = await db
      .select()
      .from(webhookConfigs)
      .where(eq(webhookConfigs.organizationId, organizationId));

    const logs = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.organizationId, organizationId),
          eq(auditLogs.userId, userId),
        ),
      );

    const requests = await db
      .select()
      .from(gdprRequests)
      .where(
        and(
          eq(gdprRequests.organizationId, organizationId),
          eq(gdprRequests.userId, userId),
        ),
      );

    const consents = await db
      .select()
      .from(userConsents)
      .where(eq(userConsents.userId, userId));

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        emailVerified: user.emailVerified,
      },
      organization: org,
      membership: membership ?? null,
      targets: orgTargets,
      versions: orgVersions.map((v) => ({
        id: v.id,
        targetId: v.targetId,
        contentHash: v.contentHash,
        crawledAt: v.crawledAt,
        hasChanges: v.hasChanges,
        // Note: Full content may be large, consider excluding or providing separately
      })),
      alerts: orgAlerts,
      alertAssignments: assignments,
      alertComments: comments,
      apiKeys: keys.map((k) => ({
        id: k.id,
        organizationId: k.organizationId,
        userId: k.userId,
        name: k.name,
        lastUsedAt: k.lastUsedAt,
        expiresAt: k.expiresAt,
        status: k.status,
        scopes: k.scopes,
        createdAt: k.createdAt,
        updatedAt: k.updatedAt,
      })),
      notificationPreferences: prefs,
      webhookConfigs: hooks,
      auditLogs: logs,
      gdprRequests: requests,
      userConsents: consents,
    };
  },

  /**
   * Delete all user data for GDPR "right to be forgotten"
   */
  async deleteUserData(
    userId: string,
    organizationId: string,
  ): Promise<{ deleted: boolean }> {
    // Note: This is a simplified version. In production, you'd want to:
    // 1. Soft delete first (mark as deleted)
    // 2. Schedule actual deletion after a grace period
    // 3. Handle cascading deletes properly
    // 4. Delete from external storage (S3, etc.)

    // Delete org-scoped artifacts tied to the user.
    await db
      .delete(alertAssignments)
      .where(eq(alertAssignments.userId, userId));

    await db.delete(alertComments).where(eq(alertComments.userId, userId));

    await db
      .delete(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.organizationId, organizationId),
          eq(notificationPreferences.userId, userId),
        ),
      );

    await db
      .delete(apiKeys)
      .where(
        and(
          eq(apiKeys.organizationId, organizationId),
          eq(apiKeys.userId, userId),
        ),
      );

    // Remove user from organization membership.
    await db
      .delete(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.organizationId, organizationId),
        ),
      );

    // If this was the last member of the org, delete the org to fully remove org data
    // (targets, versions, alerts, webhooks, etc. are org-scoped and cascade).
    const remainingMembersInOrg = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, organizationId));

    if (remainingMembersInOrg.length === 0) {
      await db
        .delete(organizations)
        .where(eq(organizations.id, organizationId));
    }

    // If user has no other organizations, delete the user account
    const remainingOrgs = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, userId));

    if (remainingOrgs.length === 0) {
      await db.delete(users).where(eq(users.id, userId));
    }

    await createAuditLog({
      organizationId,
      userId,
      action: "gdpr_data_deleted",
      metadata: { deletedAt: new Date().toISOString() },
    });

    return { deleted: true };
  },

  /**
   * Update GDPR request status
   */
  async updateRequestStatus(
    requestId: string,
    status: GDPRRequestStatus,
    metadata?: { exportUrl?: string; expiresAt?: Date },
  ): Promise<void> {
    const updateData: {
      status: GDPRRequestStatus;
      processedAt?: Date;
      completedAt?: Date;
      exportUrl?: string;
      expiresAt?: Date;
    } = {
      status,
    };

    if (status === "processing") {
      updateData.processedAt = new Date();
    } else if (status === "completed") {
      updateData.completedAt = new Date();
      if (metadata?.exportUrl) {
        updateData.exportUrl = metadata.exportUrl;
      }
      if (metadata?.expiresAt) {
        updateData.expiresAt = metadata.expiresAt;
      }
    }

    await db
      .update(gdprRequests)
      .set(updateData)
      .where(eq(gdprRequests.id, requestId));
  },
};
