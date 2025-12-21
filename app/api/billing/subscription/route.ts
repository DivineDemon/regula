import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { UserRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";
import { subscriptionService } from "@/lib/services/subscriptions";

const updatePlanSchema = z.object({
  organizationId: z.string(),
  plan: z.enum(["free", "starter", "growth", "enterprise"]),
});

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

    // Check if user has access and is admin
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

    if (!member || member.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Access denied. Admin role required." },
        { status: 403 },
      );
    }

    const subscription =
      await subscriptionService.getSubscription(organizationId);

    return NextResponse.json({ subscription }, { status: 200 });
  } catch (error) {
    console.error("Get subscription error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updatePlanSchema.parse(body);

    // Check if user has access and is admin
    const [member] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, session.user.id),
          eq(organizationMembers.organizationId, validatedData.organizationId),
        ),
      )
      .limit(1);

    if (!member || member.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Access denied. Admin role required." },
        { status: 403 },
      );
    }

    // Update subscription plan
    const subscription = await subscriptionService.updateSubscriptionPlan({
      organizationId: validatedData.organizationId,
      newPlan: validatedData.plan,
    });

    return NextResponse.json({ subscription }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      );
    }
    console.error("Update subscription error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update subscription",
      },
      { status: 500 },
    );
  }
}
