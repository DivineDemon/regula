import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/services/audit";
import {
  buildEvidencePacket,
  type EvidencePacketV1,
} from "@/lib/services/evidence-packet";
import {
  errorResponse,
  getClientIp,
  getUserAgent,
  requireOrgAccess,
} from "@/lib/utils/api-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: alertId } = await params;
    const organizationId = request.nextUrl.searchParams.get("organizationId");
    const download = request.nextUrl.searchParams.get("download") === "1";
    const includeAuditTrail =
      request.nextUrl.searchParams.get("includeAuditTrail") !== "0";

    if (!organizationId) {
      return errorResponse("organizationId is required", 400);
    }

    const user = await requireOrgAccess(organizationId);
    const baseUrl =
      request.nextUrl.origin ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    let packet: EvidencePacketV1;
    try {
      packet = await buildEvidencePacket({
        alertId,
        organizationId,
        exportedByUserId: user.id,
        baseUrl,
        includeAuditTrail,
      });
    } catch (e) {
      if (e instanceof Error && e.message === "Alert not found") {
        return errorResponse("Alert not found", 404);
      }
      throw e;
    }

    await createAuditLog({
      organizationId,
      userId: user.id,
      action: "export.evidence_packet",
      metadata: {
        alertId,
        integrity: packet.integrity.canonicalPayloadSha256,
        download,
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      },
    });

    if (download) {
      const json = `${JSON.stringify(packet, null, 2)}\n`;
      return new NextResponse(json, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="regula-evidence-${alertId}.json"`,
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
    console.error("Error building evidence packet:", error);
    return errorResponse("Internal server error", 500);
  }
}
