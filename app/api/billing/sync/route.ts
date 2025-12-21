import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { UserRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { organizationMembers, subscriptions } from "@/lib/db/schema";
import { stripe } from "@/lib/services/stripe";
import { subscriptionService } from "@/lib/services/subscriptions";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId } = body;

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

    // Get subscription from database
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId))
      .limit(1);

    let stripeSubscriptionId = subscription?.stripeSubscriptionId;
    let stripeCustomerId = subscription?.stripeCustomerId;

    // If we don't have a customer ID, try to find it by searching for customers with the admin's email
    if (!stripeCustomerId) {
      try {
        // Get organization admin email to search for customer
        const [adminMember] = await db
          .select({ userId: organizationMembers.userId })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.organizationId, organizationId),
              eq(organizationMembers.role, UserRole.ADMIN),
            ),
          )
          .limit(1);

        if (adminMember) {
          const { users } = await import("@/lib/db/schema");
          const [adminUser] = await db
            .select({ email: users.email })
            .from(users)
            .where(eq(users.id, adminMember.userId))
            .limit(1);

          if (adminUser?.email) {
            // Search for customer by email
            const customers = await stripe.customers.list({
              email: adminUser.email,
              limit: 10,
            });

            // Find customer with matching organizationId in metadata, or take the first one
            const matchingCustomer =
              customers.data.find(
                (c) => c.metadata?.organizationId === organizationId,
              ) || customers.data[0]; // Fallback to first customer if no metadata match

            if (matchingCustomer) {
              stripeCustomerId = matchingCustomer.id;
            }
          }
        }
      } catch (error) {
        console.error("Failed to find customer:", error);
      }
    }

    // Now that we have (or found) a customer ID, get subscriptions for this customer
    if (stripeCustomerId && !stripeSubscriptionId) {
      try {
        // List all subscriptions for this customer
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          limit: 10,
          status: "all", // Get all statuses to find the active one
        });

        // Find the most recent active subscription, or any subscription if none are active
        const activeSubscription =
          subscriptions.data.find(
            (sub) => sub.status === "active" || sub.status === "trialing",
          ) || subscriptions.data[0]; // Fallback to most recent

        if (activeSubscription) {
          stripeSubscriptionId = activeSubscription.id;
        }

        // If still no subscription ID, try getting it from invoices
        if (!stripeSubscriptionId) {
          const invoices = await stripe.invoices.list({
            customer: stripeCustomerId,
            limit: 10,
          });

          // Find any invoice with a subscription
          const invoiceWithSub = invoices.data.find(
            // biome-ignore lint/suspicious/noExplicitAny: Stripe Invoice type doesn't include subscription property in this API version
            (inv) => (inv as any).subscription,
          );

          if (invoiceWithSub && (invoiceWithSub as any).subscription) {
            // biome-ignore lint/suspicious/noExplicitAny: Stripe Invoice type doesn't include subscription property in this API version
            stripeSubscriptionId = (invoiceWithSub as any)
              .subscription as string;
          }
        }
      } catch (error) {
        console.error("Failed to find subscription:", error);
      }
    }

    if (!stripeSubscriptionId) {
      return NextResponse.json(
        {
          error:
            "No Stripe subscription found. Please ensure payment was completed and try again later, or contact support.",
        },
        { status: 400 },
      );
    }

    try {
      const stripeSubscription =
        await stripe.subscriptions.retrieve(stripeSubscriptionId);

      // Get the plan from metadata or determine from price ID
      let plan: "starter" | "growth" | "enterprise" = "starter";

      if (stripeSubscription.metadata?.plan) {
        plan = stripeSubscription.metadata.plan as
          | "starter"
          | "growth"
          | "enterprise";
      } else {
        // Try to determine plan from price ID
        const priceId = stripeSubscription.items.data[0]?.price.id;
        const { PLAN_CONFIGS } = await import("@/lib/services/stripe");
        for (const [planType, config] of Object.entries(PLAN_CONFIGS)) {
          if (config.priceId === priceId && planType !== "free") {
            plan = planType as "starter" | "growth" | "enterprise";
            break;
          }
        }
      }

      // Use the customer ID from the subscription
      const finalCustomerId = stripeSubscription.customer as string;

      // Create subscription record if it doesn't exist
      if (!subscription) {
        const { nanoid } = await import("nanoid");
        const subscriptionId = nanoid();

        await db.insert(subscriptions).values({
          id: subscriptionId,
          organizationId,
          plan,
          status: subscriptionService.mapStripeStatus(
            stripeSubscription.status,
          ),
          stripeSubscriptionId: stripeSubscription.id,
          stripeCustomerId: finalCustomerId,
          // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include current_period_start in this API version
          currentPeriodStart: (stripeSubscription as any).current_period_start
            ? new Date((stripeSubscription as any).current_period_start * 1000)
            : null,
          // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include current_period_end in this API version
          currentPeriodEnd: (stripeSubscription as any).current_period_end
            ? new Date((stripeSubscription as any).current_period_end * 1000)
            : null,
        });
      } else {
        // Update subscription in database
        await db
          .update(subscriptions)
          .set({
            plan,
            status: subscriptionService.mapStripeStatus(
              stripeSubscription.status,
            ),
            stripeSubscriptionId: stripeSubscription.id,
            stripeCustomerId: finalCustomerId, // Always update customer ID
            currentPeriodStart:
              // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include current_period_start in this API version
              (stripeSubscription as any).current_period_start
                ? new Date(
                    // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include current_period_start in this API version
                    (stripeSubscription as any).current_period_start * 1000,
                  )
                : null,
            currentPeriodEnd:
              // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include current_period_end in this API version
              (stripeSubscription as any).current_period_end
                ? new Date(
                    // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include current_period_end in this API version
                    (stripeSubscription as any).current_period_end * 1000,
                  )
                : null,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, subscription.id));
      }

      // Update organization plan
      const { organizations } = await import("@/lib/db/schema");
      await db
        .update(organizations)
        .set({ plan, updatedAt: new Date() })
        .where(eq(organizations.id, organizationId));

      return NextResponse.json(
        { message: "Subscription synced successfully", plan },
        { status: 200 },
      );
    } catch (error) {
      console.error("Failed to sync subscription from Stripe:", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to sync subscription from Stripe",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Sync subscription error:", error);
    return NextResponse.json(
      { error: "Failed to sync subscription" },
      { status: 500 },
    );
  }
}
