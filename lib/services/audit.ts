import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

/**
 * Audit log action types
 */
export type AuditAction =
  // Authentication
  | "user.login"
  | "user.logout"
  | "user.register"
  | "user.email_verified"
  | "user.password_reset"
  // Target operations
  | "target.created"
  | "target.updated"
  | "target.deleted"
  | "target.status_changed"
  // Alert operations
  | "alert.created"
  | "alert.status_changed"
  | "alert.assigned"
  | "alert.comment_added"
  | "alert.exported"
  // Organization operations
  | "organization.created"
  | "organization.updated"
  | "organization.member_invited"
  | "organization.member_removed"
  | "organization.member_role_changed"
  // Billing operations
  | "billing.subscription_created"
  | "billing.subscription_updated"
  | "billing.subscription_cancelled"
  | "billing.payment_method_added"
  | "billing.payment_method_removed"
  | "billing.invoice_generated"
  // Export operations
  | "export.alerts"
  | "export.compliance_report"
  // System operations
  | "system.crawl_triggered"
  | "system.crawl_completed"
  | "system.crawl_failed";

/**
 * Audit log metadata structure
 */
export interface AuditMetadata {
  [key: string]: unknown;
  targetId?: string;
  alertId?: string;
  userId?: string;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: {
  organizationId: string;
  userId?: string | null;
  action: AuditAction;
  metadata?: AuditMetadata;
}): Promise<void> {
  const { organizationId, userId, action, metadata } = params;

  try {
    const auditId = nanoid();
    await db.insert(auditLogs).values({
      id: auditId,
      organizationId,
      userId: userId ?? null,
      action,
      metadata: metadata ? JSON.stringify(metadata) : null,
      createdAt: new Date(),
    });
  } catch (error) {
    // Don't throw - audit logging failures shouldn't break the application
    console.error("Failed to create audit log:", error);
  }
}

/**
 * Get audit logs for an organization
 */
export async function getAuditLogs(params: {
  organizationId: string;
  userId?: string;
  action?: AuditAction;
  limit?: number;
  offset?: number;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const {
    organizationId,
    userId,
    action,
    limit = 100,
    offset = 0,
    dateFrom,
    dateTo,
  } = params;

  const { and, eq, gte, lte } = await import("drizzle-orm");
  const conditions = [eq(auditLogs.organizationId, organizationId)];

  if (userId) {
    conditions.push(eq(auditLogs.userId, userId));
  }

  if (action) {
    conditions.push(eq(auditLogs.action, action));
  }

  if (dateFrom) {
    conditions.push(gte(auditLogs.createdAt, dateFrom));
  }

  if (dateTo) {
    conditions.push(lte(auditLogs.createdAt, dateTo));
  }

  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

  const logs = await db
    .select()
    .from(auditLogs)
    .where(whereCondition)
    .orderBy(auditLogs.createdAt)
    .limit(limit)
    .offset(offset);

  // Parse metadata
  return logs.map((log) => ({
    ...log,
    metadata: log.metadata ? JSON.parse(log.metadata) : null,
  }));
}

/**
 * Get audit log by ID
 */
export async function getAuditLogById(
  auditLogId: string,
  organizationId: string,
) {
  const { eq, and } = await import("drizzle-orm");
  const [log] = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.id, auditLogId),
        eq(auditLogs.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!log) {
    return null;
  }

  return {
    ...log,
    metadata: log.metadata ? JSON.parse(log.metadata) : null,
  };
}
