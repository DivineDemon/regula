import { and, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import {
  alerts,
  organizationMembers,
  type TargetCategory,
  targets,
} from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    // Verify user is member of organization
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get unique categories
    const results = await db
      .selectDistinct({ category: targets.category })
      .from(alerts)
      .innerJoin(targets, eq(alerts.targetId, targets.id))
      .where(
        and(
          eq(alerts.organizationId, organizationId),
          sql`${targets.category} IS NOT NULL`,
        ),
      );

    return NextResponse.json({
      categories: results
        .map((r) => r.category)
        .filter((c): c is TargetCategory => c !== null),
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
