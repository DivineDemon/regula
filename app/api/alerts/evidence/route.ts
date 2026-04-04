import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/services/audit";
import { buildEvidencePacketForPeriod } from "@/lib/services/evidence-packet";
import {
  errorResponse,
  getClientIp,
  getUserAgent,
  requireOrgAccess,
} from "@/lib/utils/api-helpers";

function parseDateParam(raw: string | null, field: string): Date {
  if (!raw) {
    throw new Error(`${field} is required`);
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`${field} must be a valid date`);
  }
  return d;
}

export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get("organizationId");
    if (!organizationId) {
      return errorResponse("organizationId is required", 400);
    }

    const startDate = parseDateParam(
      request.nextUrl.searchParams.get("startDate"),
      "startDate",
    );
    const endDate = parseDateParam(
      request.nextUrl.searchParams.get("endDate"),
      "endDate",
    );
    const includeAuditTrailPerAlert =
      request.nextUrl.searchParams.get("includeAuditTrailPerAlert") === "1";
    const download = request.nextUrl.searchParams.get("download") === "1";
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit =
      limitParam && Number.isFinite(Number(limitParam))
        ? Number(limitParam)
        : undefined;

    const user = await requireOrgAccess(organizationId);
    const baseUrl =
      request.nextUrl.origin ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const packet = await buildEvidencePacketForPeriod({
      organizationId,
      startDate,
      endDate,
      exportedByUserId: user.id,
      baseUrl,
      includeAuditTrailPerAlert,
      limitAlerts: limit,
    });

    await createAuditLog({
      organizationId,
      userId: user.id,
      action: "export.evidence_packet",
      metadata: {
        periodExport: true,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        alertsIncluded: packet.summary.alertsIncluded,
        alertsMatchedInRange: packet.summary.alertsMatchedInRange,
        limitApplied: packet.summary.limitApplied,
        integrity: packet.integrity.canonicalPayloadSha256,
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      },
    });

    if (download) {
      const startLabel = startDate.toISOString().slice(0, 10);
      const endLabel = endDate.toISOString().slice(0, 10);
      const json = `${JSON.stringify(packet, null, 2)}\n`;
      return new NextResponse(json, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="regula-evidence-period-${startLabel}-to-${endLabel}.json"`,
        },
      });
    }

    return NextResponse.json(packet);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.includes("Access denied")) {
      return errorResponse("Access denied to this organization", 403);
    }
    if (error instanceof Error && error.message.includes("required")) {
      return errorResponse(error.message, 400);
    }
    if (error instanceof Error && error.message.includes("valid date")) {
      return errorResponse(error.message, 400);
    }
    console.error("Error building period evidence packet:", error);
    return errorResponse("Internal server error", 500);
  }
}
