import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { incidents } from "@/lib/db/schema";
import {
  errorResponse,
  requireAuth,
  requireOrgAccess,
  successResponse,
} from "@/lib/utils/api-helpers";
import { requireOrganizationAdmin } from "@/lib/utils/tenant";

const patchSchema = z.object({
  organizationId: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  status: z.enum(["open", "mitigating", "resolved"]).optional(),
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  impact: z.string().optional(),
  startedAt: z.string().datetime().nullable().optional(),
  detectedAt: z.string().datetime().nullable().optional(),
  resolvedAt: z.string().datetime().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    if (!organizationId)
      return errorResponse("organizationId is required", 400);

    await requireOrgAccess(organizationId);
    await requireOrganizationAdmin(user.id, organizationId);

    const { id } = await params;
    const [row] = await db
      .select()
      .from(incidents)
      .where(
        and(eq(incidents.id, id), eq(incidents.organizationId, organizationId)),
      )
      .limit(1);

    if (!row) return errorResponse("Incident not found", 404);
    return successResponse({ incident: row });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      error instanceof Error && error.message === "Unauthorized" ? 401 : 500,
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const input = patchSchema.parse(body);

    await requireOrgAccess(input.organizationId);
    await requireOrganizationAdmin(user.id, input.organizationId);

    const { id } = await params;
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (input.severity) update.severity = input.severity;
    if (input.status) update.status = input.status;
    if (input.title) update.title = input.title;
    if (input.description !== undefined)
      update.description = input.description ?? null;
    if (input.impact !== undefined) update.impact = input.impact ?? null;
    if (input.startedAt !== undefined)
      update.startedAt = input.startedAt ? new Date(input.startedAt) : null;
    if (input.detectedAt !== undefined)
      update.detectedAt = input.detectedAt ? new Date(input.detectedAt) : null;
    if (input.resolvedAt !== undefined)
      update.resolvedAt = input.resolvedAt ? new Date(input.resolvedAt) : null;

    const [row] = await db
      .update(incidents)
      .set(update)
      .where(
        and(
          eq(incidents.id, id),
          eq(incidents.organizationId, input.organizationId),
        ),
      )
      .returning();

    if (!row) return errorResponse("Incident not found", 404);
    return successResponse({ incident: row });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse("Invalid request data", 400, error.issues);
    }
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      error instanceof Error && error.message === "Unauthorized" ? 401 : 500,
    );
  }
}
