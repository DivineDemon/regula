import crypto from "node:crypto";
import { and, count, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { alertFeedback, alerts } from "@/lib/db/schema";
import { getAlertWithDetails } from "@/lib/services/alerts";
import { getAuditLogsForAlert } from "@/lib/services/audit";

/** Sorted-key JSON serialization for stable integrity hashing. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(
    (k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`,
  );
  return `{${pairs.join(",")}}`;
}

export type EvidencePacketV1 = {
  schema: { id: "regula.evidence_packet"; version: "1.0.0" };
  organizationId: string;
  exportedAt: string;
  exportedBy: { userId: string };
  regulaDeepLink: string;
  alert: {
    id: string;
    status: string;
    summary: string | null;
    impactScore: number | null;
    templateId: string | null;
    snoozedUntil: string | null;
    createdAt: string;
    updatedAt: string;
  };
  target: {
    id: string;
    label: string;
    url: string;
    jurisdiction: string | null;
    category: string | null;
  };
  capturedVersion: {
    id: string;
    crawledAt: string;
    contentHash: string;
    hasChanges: boolean | null;
    previousVersionId: string | null;
    diffMetadata: unknown;
    metadata: unknown;
  };
  workflow: {
    assignments: Array<{
      userId: string;
      assignedAt: string;
      userDisplayName: string | null;
      userEmail: string;
    }>;
    comments: Array<{
      id: string;
      authorUserId: string;
      content: string;
      createdAt: string;
      authorDisplayName: string | null;
      authorEmail: string;
    }>;
    markedAsFalsePositive: boolean;
  };
  auditTrail: Array<{
    id: string;
    action: string;
    createdAt: string;
    userId: string | null;
    metadata: unknown;
  }>;
  integrity: {
    canonicalPayloadSha256: string;
    algorithm: "SHA-256";
    canonicalSerialization: "regula.sorted-json-v1";
  };
};

export type EvidencePeriodPacketV1 = {
  schema: { id: "regula.evidence_packet.period"; version: "1.0.0" };
  organizationId: string;
  exportedAt: string;
  exportedBy: { userId: string };
  range: {
    startDate: string;
    endDate: string;
  };
  summary: {
    alertsIncluded: number;
    alertsMatchedInRange: number;
    limitApplied: boolean;
    perAlertAuditIncluded: boolean;
    falsePositiveCountInRange: number;
  };
  alerts: EvidencePacketV1[];
  integrity: {
    canonicalPayloadSha256: string;
    algorithm: "SHA-256";
    canonicalSerialization: "regula.sorted-json-v1";
  };
};

function parseJsonField(raw: string | null): unknown {
  if (raw === null || raw === undefined) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return { raw };
  }
}

/**
 * Immutable-style evidence export: alert, target, captured version (hashes + diff),
 * workflow state, and audit rows that reference this alert. Integrity covers all
 * fields except `integrity` itself.
 */
export async function buildEvidencePacket(params: {
  alertId: string;
  organizationId: string;
  exportedByUserId: string;
  baseUrl?: string;
  includeAuditTrail?: boolean;
}): Promise<EvidencePacketV1> {
  const details = await getAlertWithDetails(
    params.alertId,
    params.organizationId,
  );
  if (!details) {
    throw new Error("Alert not found");
  }

  const baseUrl =
    params.baseUrl ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  const regulaDeepLink = `${baseUrl}/alerts/${params.alertId}?organizationId=${encodeURIComponent(params.organizationId)}`;

  const includeAudit = params.includeAuditTrail !== false;
  const auditRows = includeAudit
    ? await getAuditLogsForAlert({
        organizationId: params.organizationId,
        alertId: params.alertId,
        limit: 500,
      })
    : [];

  const {
    alert,
    target,
    version,
    assignments,
    comments,
    markedAsFalsePositive,
  } = details;

  const commentsChronological = [...comments].reverse();

  const body = {
    schema: {
      id: "regula.evidence_packet" as const,
      version: "1.0.0" as const,
    },
    organizationId: params.organizationId,
    exportedAt: new Date().toISOString(),
    exportedBy: { userId: params.exportedByUserId },
    regulaDeepLink,
    alert: {
      id: alert.id,
      status: alert.status,
      summary: alert.summary,
      impactScore: alert.impactScore,
      templateId: alert.templateId ?? null,
      snoozedUntil: alert.snoozedUntil?.toISOString() ?? null,
      createdAt: alert.createdAt.toISOString(),
      updatedAt: alert.updatedAt.toISOString(),
    },
    target: {
      id: target.id,
      label: target.label,
      url: target.url,
      jurisdiction: target.jurisdiction,
      category: target.category,
    },
    capturedVersion: {
      id: version.id,
      crawledAt: version.crawledAt.toISOString(),
      contentHash: version.contentHash,
      hasChanges: version.hasChanges,
      previousVersionId: version.previousVersionId,
      diffMetadata: parseJsonField(version.diffMetadata),
      metadata: parseJsonField(version.metadata),
    },
    workflow: {
      assignments: assignments.map((a) => ({
        userId: a.userId,
        assignedAt: a.assignedAt.toISOString(),
        userDisplayName: a.user.name,
        userEmail: a.user.email,
      })),
      comments: commentsChronological.map((c) => ({
        id: c.id,
        authorUserId: c.userId,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        authorDisplayName: c.user.name,
        authorEmail: c.user.email,
      })),
      markedAsFalsePositive,
    },
    auditTrail: auditRows.map((log) => ({
      id: log.id,
      action: log.action,
      createdAt: log.createdAt.toISOString(),
      userId: log.userId,
      metadata: log.metadata,
    })),
  };

  const canonicalPayloadSha256 = crypto
    .createHash("sha256")
    .update(stableStringify(body))
    .digest("hex");

  return {
    ...body,
    integrity: {
      canonicalPayloadSha256,
      algorithm: "SHA-256",
      canonicalSerialization: "regula.sorted-json-v1",
    },
  };
}

/**
 * Period-level evidence export.
 * Builds per-alert evidence packets for alerts created in the range.
 */
export async function buildEvidencePacketForPeriod(params: {
  organizationId: string;
  startDate: Date;
  endDate: Date;
  exportedByUserId: string;
  baseUrl?: string;
  includeAuditTrailPerAlert?: boolean;
  limitAlerts?: number;
}): Promise<EvidencePeriodPacketV1> {
  const {
    organizationId,
    startDate,
    endDate,
    exportedByUserId,
    baseUrl,
    includeAuditTrailPerAlert = false,
    limitAlerts = 200,
  } = params;

  const safeLimit = Math.max(1, Math.min(limitAlerts, 1000));

  const [alertsInRangeCount, fpDistinctRow, alertIds] = await Promise.all([
    db
      .select({ total: count() })
      .from(alerts)
      .where(
        and(
          eq(alerts.organizationId, organizationId),
          gte(alerts.createdAt, startDate),
          lte(alerts.createdAt, endDate),
        ),
      ),
    db
      .select({
        count: sql<number>`count(distinct ${alertFeedback.alertId})`,
      })
      .from(alertFeedback)
      .innerJoin(alerts, eq(alertFeedback.alertId, alerts.id))
      .where(
        and(
          eq(alertFeedback.organizationId, organizationId),
          eq(alertFeedback.type, "false_positive"),
          gte(alerts.createdAt, startDate),
          lte(alerts.createdAt, endDate),
        ),
      ),
    db
      .select({ id: alerts.id })
      .from(alerts)
      .where(
        and(
          eq(alerts.organizationId, organizationId),
          gte(alerts.createdAt, startDate),
          lte(alerts.createdAt, endDate),
        ),
      )
      .orderBy(alerts.createdAt)
      .limit(safeLimit),
  ]);

  const perAlertPackets = await Promise.all(
    alertIds.map((row) =>
      buildEvidencePacket({
        alertId: row.id,
        organizationId,
        exportedByUserId,
        baseUrl,
        includeAuditTrail: includeAuditTrailPerAlert,
      }),
    ),
  );

  const matched = Number(alertsInRangeCount[0]?.total ?? 0);
  const body = {
    schema: {
      id: "regula.evidence_packet.period" as const,
      version: "1.0.0" as const,
    },
    organizationId,
    exportedAt: new Date().toISOString(),
    exportedBy: { userId: exportedByUserId },
    range: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    summary: {
      alertsIncluded: perAlertPackets.length,
      alertsMatchedInRange: matched,
      limitApplied: matched > safeLimit,
      perAlertAuditIncluded: includeAuditTrailPerAlert,
      falsePositiveCountInRange: Number(fpDistinctRow[0]?.count ?? 0),
    },
    alerts: perAlertPackets,
  };

  const canonicalPayloadSha256 = crypto
    .createHash("sha256")
    .update(stableStringify(body))
    .digest("hex");

  return {
    ...body,
    integrity: {
      canonicalPayloadSha256,
      algorithm: "SHA-256",
      canonicalSerialization: "regula.sorted-json-v1",
    },
  };
}
