import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";
import { quotaService } from "@/lib/services/quotas";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Check if user has access to organization
    const [member] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, session.user.id),
          eq(organizationMembers.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (!member) {
      return NextResponse.json(
        { error: "Access denied to this organization" },
        { status: 403 },
      );
    }

    // Get quota information
    const quotaInfo = await quotaService.getQuotaInfo(organizationId);

    return NextResponse.json(quotaInfo, { status: 200 });
  } catch (error) {
    console.error("Get usage error:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage information" },
      { status: 500 },
    );
  }
}
