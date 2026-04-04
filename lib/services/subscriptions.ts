import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { organizations, subscriptions } from "@/lib/db/schema";
import type { SubscriptionStatus } from "@/lib/db/schema/subscriptions";
import { PLAN_CONFIGS, type PlanType as StripePlanType } from "@/lib/plans";
import { stripeService } from "./stripe";

/**
 * Subscription management service
 */
export const subscriptionService = {
  /**
   * Get subscription for an organization
   */
  async getSubscription(organizationId: string) {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId))
      .limit(1);

    return subscription ?? null;
  },

  /**
   * Create a free subscription (default for new organizations)
   */
  async createFreeSubscription(organizationId: string) {
    const subscriptionId = nanoid();
    const now = new Date();
    const oneYearFromNow = new Date(now);
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    const [subscription] = await db
      .insert(subscriptions)
      .values({
        id: subscriptionId,
        organizationId,
        plan: "free",
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: oneYearFromNow,
      })
      .returning();

    // Also update organization plan
    await db
      .update(organizations)
      .set({ plan: "free", updatedAt: new Date() })
      .where(eq(organizations.id, organizationId));

    return subscription;
  },

  /**
   * Create a paid subscription with Stripe
   */
  async createPaidSubscription({
    organizationId,
    customerId,
    plan,
  }: {
    organizationId: string;
    customerId: string;
    plan: Exclude<StripePlanType, "free">;
  }) {
    const planConfig = PLAN_CONFIGS[plan];
    if (!planConfig.priceId) {
      throw new Error(`Price ID not configured for plan: ${plan}`);
    }

    // Create Stripe subscription
    const stripeSubscription = await stripeService.createSubscription({
      customerId,
      priceId: planConfig.priceId,
      metadata: {
        organizationId,
        plan,
      },
    });

    // Calculate period dates
    const now = new Date();
    // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include current_period_end in this API version
    const periodEnd = (stripeSubscription as any).current_period_end
      ? // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include current_period_end in this API version
        new Date((stripeSubscription as any).current_period_end * 1000)
      : new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Create or update subscription in database
    const existing = await this.getSubscription(organizationId);
    let subscription: typeof subscriptions.$inferSelect | undefined;

    if (existing) {
      const [updated] = await db
        .update(subscriptions)
        .set({
          plan,
          status: this.mapStripeStatus(stripeSubscription.status),
          stripeCustomerId: customerId,
          stripeSubscriptionId: stripeSubscription.id,
          currentPeriodStart:
            // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include current_period_start in this API version
            (stripeSubscription as any).current_period_start
              ? new Date(
                  // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include current_period_start in this API version
                  (stripeSubscription as any).current_period_start * 1000,
                )
              : now,
          currentPeriodEnd: periodEnd,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, existing.id))
        .returning();
      subscription = updated;
    } else {
      const subscriptionId = nanoid();
      const [created] = await db
        .insert(subscriptions)
        .values({
          id: subscriptionId,
          organizationId,
          plan,
          status: this.mapStripeStatus(stripeSubscription.status),
          stripeCustomerId: customerId,
          stripeSubscriptionId: stripeSubscription.id,
          currentPeriodStart:
            // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include current_period_start in this API version
            (stripeSubscription as any).current_period_start
              ? new Date(
                  // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include current_period_start in this API version
                  (stripeSubscription as any).current_period_start * 1000,
                )
              : now,
          currentPeriodEnd: periodEnd,
        })
        .returning();
      subscription = created;
    }

    // Update organization plan
    await db
      .update(organizations)
      .set({ plan, updatedAt: new Date() })
      .where(eq(organizations.id, organizationId));

    return subscription;
  },

  /**
   * Update subscription plan
   */
  async updateSubscriptionPlan({
    organizationId,
    newPlan,
  }: {
    organizationId: string;
    newPlan: StripePlanType;
  }) {
    const subscription = await this.getSubscription(organizationId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    // If upgrading to/from free plan, handle differently
    if (newPlan === "free") {
      // Cancel Stripe subscription if it exists
      if (subscription.stripeSubscriptionId) {
        await stripeService.cancelSubscription({
          subscriptionId: subscription.stripeSubscriptionId,
          cancelImmediately: false, // Cancel at period end
        });
      }

      // Update to free plan
      await db
        .update(subscriptions)
        .set({
          plan: "free",
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscription.id));

      await db
        .update(organizations)
        .set({ plan: "free", updatedAt: new Date() })
        .where(eq(organizations.id, organizationId));

      return subscription;
    }

    // Paid plan changes require Stripe subscription
    if (!subscription.stripeSubscriptionId || !subscription.stripeCustomerId) {
      throw new Error(
        "Stripe subscription not found. Please create a subscription first.",
      );
    }

    const planConfig = PLAN_CONFIGS[newPlan];
    if (!planConfig.priceId) {
      throw new Error(`Price ID not configured for plan: ${newPlan}`);
    }

    // Update Stripe subscription
    const stripeSubscription = await stripeService.updateSubscription({
      subscriptionId: subscription.stripeSubscriptionId,
      priceId: planConfig.priceId,
    });

    // Update database
    const [updated] = await db
      .update(subscriptions)
      .set({
        plan: newPlan,
        status: this.mapStripeStatus(stripeSubscription.status),
        currentPeriodStart:
          // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include current_period_start in this API version
          (stripeSubscription as any).current_period_start
            ? new Date(
                // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include current_period_start in this API version
                (stripeSubscription as any).current_period_start * 1000,
              )
            : subscription.currentPeriodStart,
        currentPeriodEnd:
          // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include current_period_end in this API version
          (stripeSubscription as any).current_period_end
            ? new Date(
                // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include current_period_end in this API version
                (stripeSubscription as any).current_period_end * 1000,
              )
            : subscription.currentPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id))
      .returning();

    await db
      .update(organizations)
      .set({ plan: newPlan, updatedAt: new Date() })
      .where(eq(organizations.id, organizationId));

    return updated;
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription({
    organizationId,
    cancelImmediately = false,
  }: {
    organizationId: string;
    cancelImmediately?: boolean;
  }) {
    const subscription = await this.getSubscription(organizationId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    // If free plan, just downgrade
    if (subscription.plan === "free") {
      return subscription;
    }

    // Cancel Stripe subscription
    if (subscription.stripeSubscriptionId) {
      await stripeService.cancelSubscription({
        subscriptionId: subscription.stripeSubscriptionId,
        cancelImmediately,
      });
    }

    // Update status in database
    const [updated] = await db
      .update(subscriptions)
      .set({
        status: cancelImmediately ? "canceled" : subscription.status,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id))
      .returning();

    return updated;
  },

  /**
   * Map Stripe subscription status to our status
   */
  mapStripeStatus(stripeStatus: string): SubscriptionStatus {
    switch (stripeStatus) {
      case "active":
        return "active";
      case "canceled":
      case "unpaid":
        return "canceled";
      case "past_due":
        return "past_due";
      case "trialing":
        return "trialing";
      default:
        return "active";
    }
  },
};
