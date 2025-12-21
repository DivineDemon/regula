import { and, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { alerts, organizationMembers } from "@/lib/db/schema";
import type { AlertStatus } from "@/lib/db/schema/alerts";

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, alertIds, status } = body;

    if (!organizationId || !alertIds || !Array.isArray(alertIds) || !status) {
      return NextResponse.json(
        { error: "organizationId, alertIds (array), and status are required" },
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

    // Update all alerts
    const updated = await db
      .update(alerts)
      .set({
        status: status as AlertStatus,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(alerts.organizationId, organizationId),
          inArray(alerts.id, alertIds),
        ),
      )
      .returning();

    return NextResponse.json({
      success: true,
      updated: updated.length,
    });
  } catch (error) {
    console.error("Error updating alerts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
