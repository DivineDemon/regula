import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";

/**
 * Webhook endpoint for external systems to receive alert notifications
 * This is a GET endpoint that can be used to test webhook connectivity
 * Actual webhook calls are made from the notification service
 */
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

    return NextResponse.json({
      message: "Webhook endpoint is active",
      organizationId,
      webhookUrl: `${request.nextUrl.origin}/api/webhooks/notify`,
      note: "Configure your webhook URL in notification preferences",
    });
  } catch (error) {
    console.error("Error in webhook endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST endpoint for receiving webhook callbacks (for future use)
 * This can be used if you want to receive webhook responses
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature if needed
    const body = await request.json();

    // Log webhook payload for debugging
    console.log("Webhook received:", body);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
