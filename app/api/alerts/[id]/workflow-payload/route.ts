import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  toWorkflowContract,
  type WorkflowContractProvider,
} from "@/lib/contracts/outbound-workflow";
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

const PROVIDERS: WorkflowContractProvider[] = ["jira", "servicenow", "generic"];

function isProvider(s: string): s is WorkflowContractProvider {
  return PROVIDERS.includes(s as WorkflowContractProvider);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: alertId } = await params;
    const organizationId = request.nextUrl.searchParams.get("organizationId");
    const providerRaw = request.nextUrl.searchParams.get("provider");
    const includeAuditTrail =
      request.nextUrl.searchParams.get("includeAuditTrail") !== "0";

    if (!organizationId) {
      return errorResponse("organizationId is required", 400);
    }

    if (!providerRaw || !isProvider(providerRaw)) {
      return errorResponse(
        `provider is required and must be one of: ${PROVIDERS.join(", ")}`,
        400,
      );
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

    const payload = toWorkflowContract(packet, providerRaw);

    await createAuditLog({
      organizationId,
      userId: user.id,
      action: "export.workflow_contract",
      metadata: {
        alertId,
        provider: providerRaw,
        evidenceIntegrity: packet.integrity.canonicalPayloadSha256,
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      },
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.includes("Access denied")) {
      return errorResponse("Access denied to this organization", 403);
    }
    console.error("Error building workflow payload:", error);
    return errorResponse("Internal server error", 500);
  }
}
