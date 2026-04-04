import { and, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { notificationPreferences, organizationMembers } from "@/lib/db/schema";
import { validateWebhookUrl } from "@/lib/services/webhook";

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
      categoryFilters: null,
      webhookEnabled: false,
      webhookUrl: null,
      webhookSecret: null,
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
      categoryFilters,
      webhookEnabled,
      webhookUrl,
      webhookSecret,
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

    // Validate webhook URL if provided
    if (webhookUrl !== undefined && webhookUrl !== null) {
      if (webhookEnabled && !webhookUrl) {
        return NextResponse.json(
          { error: "Webhook URL is required when webhooks are enabled" },
          { status: 400 },
        );
      }

      if (webhookUrl) {
        const validation = validateWebhookUrl(webhookUrl);
        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error || "Invalid webhook URL" },
            { status: 400 },
          );
        }
      }
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
      const updateData: {
        emailEnabled?: boolean;
        emailRealtime?: boolean;
        emailDigest?: boolean;
        emailDigestFrequency?: string;
        alertThreshold?: string;
        categoryFilters?: string[] | null;
        webhookEnabled?: boolean;
        webhookUrl?: string | null;
        webhookSecret?: string | null;
        updatedAt: Date;
      } = {
        updatedAt: new Date(),
      };

      if (emailEnabled !== undefined) updateData.emailEnabled = emailEnabled;
      if (emailRealtime !== undefined) updateData.emailRealtime = emailRealtime;
      if (emailDigest !== undefined) updateData.emailDigest = emailDigest;
      if (emailDigestFrequency !== undefined)
        updateData.emailDigestFrequency = emailDigestFrequency;
      if (alertThreshold !== undefined)
        updateData.alertThreshold = alertThreshold;
      if (categoryFilters !== undefined)
        updateData.categoryFilters = Array.isArray(categoryFilters)
          ? categoryFilters
          : null;
      if (webhookEnabled !== undefined)
        updateData.webhookEnabled = webhookEnabled;
      if (webhookUrl !== undefined) updateData.webhookUrl = webhookUrl || null;
      if (webhookSecret !== undefined)
        updateData.webhookSecret = webhookSecret || null;

      const [updated] = await db
        .update(notificationPreferences)
        .set(updateData)
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
          categoryFilters: Array.isArray(categoryFilters)
            ? categoryFilters
            : null,
          webhookEnabled: webhookEnabled ?? false,
          webhookUrl: webhookUrl ?? null,
          webhookSecret: webhookSecret ?? null,
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
