import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { UserRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import {
  organizationMembers,
  organizations,
  subscriptions,
  users,
} from "@/lib/db/schema";
import { PLAN_CONFIGS, stripeService } from "@/lib/services/stripe";
import { subscriptionService } from "@/lib/services/subscriptions";

const createCheckoutSchema = z.object({
  organizationId: z.string(),
  plan: z.enum(["starter", "growth", "enterprise"]),
});

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createCheckoutSchema.parse(body);

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

    // Get subscription to get customer ID
    // If subscription doesn't exist, create a free one first
    let subscription = await subscriptionService.getSubscription(
      validatedData.organizationId,
    );

    if (!subscription) {
      // Create a free subscription if one doesn't exist
      // This can happen if the organization was created before subscriptions were properly initialized
      subscription = await subscriptionService.createFreeSubscription(
        validatedData.organizationId,
      );

      // Try to get or create Stripe customer for the organization
      // Get organization to check if we have user email for Stripe customer creation
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, validatedData.organizationId))
        .limit(1);

      if (org && !subscription.stripeCustomerId) {
        // Get the admin user's email to create Stripe customer
        const [adminMember] = await db
          .select({
            userId: organizationMembers.userId,
          })
          .from(organizationMembers)
          .where(
            and(
              eq(
                organizationMembers.organizationId,
                validatedData.organizationId,
              ),
              eq(organizationMembers.role, UserRole.ADMIN),
            ),
          )
          .limit(1);

        if (adminMember) {
          const [adminUser] = await db
            .select({ email: users.email, name: users.name })
            .from(users)
            .where(eq(users.id, adminMember.userId))
            .limit(1);

          if (adminUser?.email) {
            try {
              const customer = await stripeService.createCustomer({
                email: adminUser.email,
                name: adminUser.name ?? org.name,
                metadata: {
                  organizationId: validatedData.organizationId,
                },
              });

              // Update subscription with Stripe customer ID
              await db
                .update(subscriptions)
                .set({ stripeCustomerId: customer.id })
                .where(eq(subscriptions.id, subscription.id));

              subscription.stripeCustomerId = customer.id;
            } catch (error) {
              console.error("Failed to create Stripe customer:", error);
              // Continue without customer ID - Stripe will create one during checkout
            }
          }
        }
      }
    }

    const planConfig = PLAN_CONFIGS[validatedData.plan];
    if (!planConfig.priceId) {
      return NextResponse.json(
        { error: `Price ID not configured for plan: ${validatedData.plan}` },
        { status: 400 },
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const successUrl = `${baseUrl}/settings/billing?success=true`;
    const cancelUrl = `${baseUrl}/settings/billing?canceled=true`;

    // Create checkout session
    const checkoutSession = await stripeService.createCheckoutSession({
      customerId: subscription.stripeCustomerId ?? undefined,
      priceId: planConfig.priceId,
      successUrl,
      cancelUrl,
      metadata: {
        organizationId: validatedData.organizationId,
        plan: validatedData.plan,
      },
    });

    return NextResponse.json(
      { sessionId: checkoutSession.id, url: checkoutSession.url },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      );
    }
    console.error("Create checkout error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to create checkout session";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
