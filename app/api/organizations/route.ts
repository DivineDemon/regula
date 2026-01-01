import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { UserRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import {
  organizationMembers,
  organizations,
  subscriptions,
} from "@/lib/db/schema";
import { stripeService } from "@/lib/services/stripe";

const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, "Organization name is required")
    .max(100, "Organization name is too long"),
});

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createOrganizationSchema.parse(body);

    // Generate organization slug
    const orgSlug = validatedData.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    // Check if organization name (slug) is already taken
    const [existingOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, orgSlug))
      .limit(1);

    if (existingOrg) {
      return NextResponse.json(
        { error: "Organization name is already taken" },
        { status: 400 },
      );
    }

    // Generate IDs
    const organizationId = nanoid();

    // Create organization, membership, and subscription in a transaction
    const subscriptionId = nanoid();
    const now = new Date();
    const oneYearFromNow = new Date(now);
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    await db.transaction(async (tx) => {
      // Create organization
      await tx.insert(organizations).values({
        id: organizationId,
        name: validatedData.name,
        slug: orgSlug,
        plan: "free",
      });

      // Add user as admin to organization
      await tx.insert(organizationMembers).values({
        userId: session.user.id,
        organizationId,
        role: UserRole.ADMIN,
      });

      // Create default subscription (free plan)
      await tx.insert(subscriptions).values({
        id: subscriptionId,
        organizationId,
        plan: "free",
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: oneYearFromNow,
      });
    });

    // Create Stripe customer for the organization (for future paid subscriptions)
    // Do this outside the transaction since it's an external API call
    // If it fails, we still have a working organization with a free subscription
    try {
      await stripeService.createCustomer({
        email: session.user.email || "",
        name: validatedData.name,
        metadata: {
          organizationId,
        },
      });
    } catch (error) {
      // Log error but don't fail the organization creation
      console.error("Failed to create Stripe customer:", error);
    }

    return NextResponse.json(
      {
        message: "Organization created successfully",
        organization: {
          id: organizationId,
          name: validatedData.name,
          slug: orgSlug,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation error" },
        { status: 400 },
      );
    }

    console.error("Organization creation error:", error);
    return NextResponse.json(
      { error: "Failed to create organization. Please try again." },
      { status: 500 },
    );
  }
}
