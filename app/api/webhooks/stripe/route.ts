import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { stripe } from "@/lib/services/stripe";
import { subscriptionService } from "@/lib/services/subscriptions";
import { usageWarningService } from "@/lib/services/usage-warnings";

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("STRIPE_WEBHOOK_SECRET must be set in environment variables");
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * POST handler for Stripe webhooks
 */
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 },
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      console.error("Webhook signature verification failed:", error);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      case "customer.subscription.trial_will_end":
      case "invoice.upcoming": {
        // These can be handled for notifications later
        console.log(`Received ${event.type} event`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}

/**
 * Handle checkout session completed event
 * This is triggered when a customer successfully completes checkout
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const organizationId = session.metadata?.organizationId;
  const plan = session.metadata?.plan as
    | "starter"
    | "growth"
    | "enterprise"
    | undefined;

  if (!organizationId) {
    console.error("Checkout session missing organizationId metadata");
    return;
  }

  if (!plan) {
    console.error("Checkout session missing plan metadata");
    return;
  }

  // Get the subscription ID from the checkout session
  const subscriptionId = session.subscription as string | null;
  if (!subscriptionId) {
    console.error("Checkout session missing subscription ID");
    return;
  }

  // Retrieve the full subscription object from Stripe
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await handleSubscriptionUpdate(subscription, organizationId, plan);
  } catch (error) {
    console.error("Failed to retrieve subscription from Stripe:", error);
  }
}

/**
 * Handle subscription created/updated events
 */
async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription,
  organizationId?: string,
  plan?: "starter" | "growth" | "enterprise",
) {
  // If organizationId and plan are not provided, try to get from metadata
  const orgId = organizationId || subscription.metadata?.organizationId;
  const planType =
    plan ||
    (subscription.metadata?.plan as "starter" | "growth" | "enterprise");

  if (!orgId) {
    console.error("Subscription missing organizationId");
    return;
  }

  // Get the plan from metadata or use provided plan
  const subscriptionPlan = planType || "starter";

  // Update subscription in database
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, orgId))
    .limit(1);

  if (existing) {
    await db
      .update(subscriptions)
      .set({
        plan: subscriptionPlan,
        status: subscriptionService.mapStripeStatus(subscription.status),
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        currentPeriodStart:
          // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include current_period_start in this API version
          (subscription as any).current_period_start
            ? new Date(
                // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include current_period_start in this API version
                (subscription as any).current_period_start * 1000,
              )
            : null,
        currentPeriodEnd:
          // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include current_period_end in this API version
          (subscription as any).current_period_end
            ? new Date(
                // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include current_period_end in this API version
                (subscription as any).current_period_end * 1000,
              )
            : null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existing.id));
  } else {
    // Create subscription if it doesn't exist (shouldn't happen but handle it)
    console.log(
      `Creating missing subscription record for organization: ${orgId}`,
    );
    const { nanoid } = await import("nanoid");
    const subscriptionId = nanoid();

    await db.insert(subscriptions).values({
      id: subscriptionId,
      organizationId: orgId,
      plan: subscriptionPlan,
      status: subscriptionService.mapStripeStatus(subscription.status),
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include current_period_start in this API version
      currentPeriodStart: (subscription as any).current_period_start
        ? new Date((subscription as any).current_period_start * 1000)
        : null,
      // biome-ignore lint/suspicious/noExplicitAny: Stripe types don't include current_period_end in this API version
      currentPeriodEnd: (subscription as any).current_period_end
        ? new Date((subscription as any).current_period_end * 1000)
        : null,
    });
  }

  // Also update organization plan
  const { organizations } = await import("@/lib/db/schema");
  await db
    .update(organizations)
    .set({ plan: subscriptionPlan, updatedAt: new Date() })
    .where(eq(organizations.id, orgId));
}

/**
 * Handle subscription deleted event
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata?.organizationId;
  if (!organizationId) {
    console.error("Subscription missing organizationId metadata");
    return;
  }

  // Update subscription status to canceled
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1);

  if (existing) {
    await db
      .update(subscriptions)
      .set({
        status: "canceled",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existing.id));

    // Optionally downgrade to free plan
    // This depends on your business logic
    // await subscriptionService.updateSubscriptionPlan({ organizationId, newPlan: "free" });
  }
}

/**
 * Handle invoice paid event
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  if (!customerId) {
    return;
  }

  // Find subscription by customer ID
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, customerId))
    .limit(1);

  if (subscription) {
    // Invoice is paid, ensure subscription is active
    await db
      .update(subscriptions)
      .set({
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));
  }
}

/**
 * Handle invoice payment failed event
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  if (!customerId) {
    return;
  }

  // Find subscription by customer ID
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, customerId))
    .limit(1);

  if (subscription) {
    // Mark subscription as past_due
    await db
      .update(subscriptions)
      .set({
        status: "past_due",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));

    // Check usage and send warnings
    await usageWarningService.checkAndSendWarnings(subscription.organizationId);
  }
}
