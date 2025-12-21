import { and, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { notificationPreferences, organizationMembers } from "@/lib/db/schema";

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

    // Get user preferences first, then org preferences as fallback
    const [userPrefs] = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, session.user.id),
          eq(notificationPreferences.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (userPrefs) {
      return NextResponse.json(userPrefs);
    }

    // Get org-level preferences (where userId is null)
    const [orgPrefs] = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.organizationId, organizationId),
          isNull(notificationPreferences.userId),
        ),
      )
      .limit(1);

    if (orgPrefs) {
      return NextResponse.json(orgPrefs);
    }

    // Return defaults
    return NextResponse.json({
      emailEnabled: true,
      emailRealtime: true,
      emailDigest: true,
      emailDigestFrequency: "daily",
      alertThreshold: "all",
      webhookEnabled: false,
      webhookUrl: null,
    });
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      organizationId,
      emailEnabled,
      emailRealtime,
      emailDigest,
      emailDigestFrequency,
      alertThreshold,
      webhookEnabled,
      webhookUrl,
    } = body;

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

    // Check if preferences exist
    const [existing] = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, session.user.id),
          eq(notificationPreferences.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (existing) {
      // Update existing preferences
      const [updated] = await db
        .update(notificationPreferences)
        .set({
          emailEnabled: emailEnabled ?? existing.emailEnabled,
          emailRealtime: emailRealtime ?? existing.emailRealtime,
          emailDigest: emailDigest ?? existing.emailDigest,
          emailDigestFrequency:
            emailDigestFrequency ?? existing.emailDigestFrequency,
          alertThreshold: alertThreshold ?? existing.alertThreshold,
          webhookEnabled: webhookEnabled ?? existing.webhookEnabled,
          webhookUrl: webhookUrl ?? existing.webhookUrl,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreferences.id, existing.id))
        .returning();

      return NextResponse.json(updated);
    } else {
      // Create new preferences
      const [created] = await db
        .insert(notificationPreferences)
        .values({
          id: nanoid(),
          userId: session.user.id,
          organizationId,
          emailEnabled: emailEnabled ?? true,
          emailRealtime: emailRealtime ?? true,
          emailDigest: emailDigest ?? true,
          emailDigestFrequency: emailDigestFrequency ?? "daily",
          alertThreshold: alertThreshold ?? "all",
          webhookEnabled: webhookEnabled ?? false,
          webhookUrl: webhookUrl ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return NextResponse.json(created);
    }
  } catch (error) {
    console.error("Error saving notification preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
