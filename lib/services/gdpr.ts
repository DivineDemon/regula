import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import {
  alertAssignments,
  alertComments,
  alerts,
  type GDPRRequestStatus,
  type GDPRRequestType,
  gdprRequests,
  organizationMembers,
  targets,
  users,
  versions,
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
    organizations: unknown[];
    targets: unknown[];
    alerts: unknown[];
    versions: unknown[];
    memberships: unknown[];
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

    // Get user's organizations
    const userOrgs = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, userId));

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
    const _assignments =
      alertIds.length > 0
        ? await db
            .select()
            .from(alertAssignments)
            .where(inArray(alertAssignments.alertId, alertIds))
        : [];

    // Get alert comments
    const _comments =
      alertIds.length > 0
        ? await db
            .select()
            .from(alertComments)
            .where(inArray(alertComments.alertId, alertIds))
        : [];

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        emailVerified: user.emailVerified,
      },
      organizations: userOrgs,
      targets: orgTargets,
      alerts: orgAlerts,
      versions: orgVersions.map((v) => ({
        id: v.id,
        targetId: v.targetId,
        contentHash: v.contentHash,
        crawledAt: v.crawledAt,
        hasChanges: v.hasChanges,
        // Note: Full content may be large, consider excluding or providing separately
      })),
      memberships: userOrgs,
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

    // Delete user's alert assignments
    await db
      .delete(alertAssignments)
      .where(eq(alertAssignments.userId, userId));

    // Delete user's alert comments
    await db.delete(alertComments).where(eq(alertComments.userId, userId));

    // Remove user from organization (this will cascade)
    await db
      .delete(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.organizationId, organizationId),
        ),
      );

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
