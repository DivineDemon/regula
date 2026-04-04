import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
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

const createSchema = z.object({
  organizationId: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  title: z.string().min(3),
  description: z.string().optional(),
  impact: z.string().optional(),
  startedAt: z.string().datetime().optional(),
  detectedAt: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    if (!organizationId)
      return errorResponse("organizationId is required", 400);

    await requireOrgAccess(organizationId);
    await requireOrganizationAdmin(user.id, organizationId);

    const rows = await db
      .select()
      .from(incidents)
      .where(eq(incidents.organizationId, organizationId))
      .orderBy(desc(incidents.createdAt));

    return successResponse({ incidents: rows });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      error instanceof Error && error.message === "Unauthorized" ? 401 : 500,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const input = createSchema.parse(body);

    await requireOrgAccess(input.organizationId);
    await requireOrganizationAdmin(user.id, input.organizationId);

    const id = nanoid();
    const now = new Date();

    const values = {
      id,
      organizationId: input.organizationId,
      createdByUserId: user.id,
      severity: input.severity,
      status: "open" as const,
      title: input.title,
      description: input.description ?? null,
      impact: input.impact ?? null,
      startedAt: input.startedAt ? new Date(input.startedAt) : null,
      detectedAt: input.detectedAt ? new Date(input.detectedAt) : null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(incidents).values(values);

    return successResponse({ incident: values }, 201);
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
