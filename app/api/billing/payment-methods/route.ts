import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { UserRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { organizationMembers, subscriptions } from "@/lib/db/schema";
import { stripe, stripeService } from "@/lib/services/stripe";
import { subscriptionService } from "@/lib/services/subscriptions";

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

    // Get subscription to get customer ID
    const subscription =
      await subscriptionService.getSubscription(organizationId);

    let customerId = subscription?.stripeCustomerId;

    // If no customer ID, try to find it from Stripe by searching for customer with organization metadata
    if (!customerId) {
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
          try {
            // Search for customer by email
            const customers = await stripe.customers.list({
              email: adminUser.email,
              limit: 10,
            });

            // Find customer that has this organization in metadata
            const matchingCustomer = customers.data.find(
              (c) => c.metadata?.organizationId === organizationId,
            );

            if (matchingCustomer) {
              customerId = matchingCustomer.id;
              // Update subscription with customer ID if subscription exists
              if (subscription) {
                await db
                  .update(subscriptions)
                  .set({ stripeCustomerId: customerId, updatedAt: new Date() })
                  .where(eq(subscriptions.id, subscription.id));
              }
            }
          } catch (error) {
            console.error("Failed to find customer:", error);
          }
        }
      }
    }

    if (!customerId) {
      return NextResponse.json({ paymentMethods: [] }, { status: 200 });
    }

    // Get payment methods from Stripe (attached payment methods)
    const paymentMethods = await stripeService.getPaymentMethods(customerId);

    // Get customer and subscription to find default payment methods
    let defaultPaymentMethodId: string | null = null;
    try {
      const customer = await stripe.customers.retrieve(customerId);

      if (customer && !customer.deleted) {
        // Get customer's default payment method
        if (customer.invoice_settings?.default_payment_method) {
          defaultPaymentMethodId = customer.invoice_settings
            .default_payment_method as string;

          // Check if it's already in the list
          const alreadyInList = paymentMethods.some(
            (pm) => pm.id === defaultPaymentMethodId,
          );

          if (!alreadyInList) {
            try {
              const defaultPm = await stripe.paymentMethods.retrieve(
                defaultPaymentMethodId,
                { expand: ["card"] },
              );
              // Add default payment method to the beginning of the list
              paymentMethods.unshift(defaultPm);
            } catch (error) {
              console.error(
                "Failed to retrieve default payment method:",
                error,
              );
            }
          }
        }

        // Also check subscription's default payment method (might be different)
        if (subscription?.stripeSubscriptionId) {
          try {
            const stripeSub = await stripe.subscriptions.retrieve(
              subscription.stripeSubscriptionId,
            );

            if (
              stripeSub.default_payment_method &&
              typeof stripeSub.default_payment_method === "string"
            ) {
              const subDefaultPmId = stripeSub.default_payment_method;
              const alreadyInList = paymentMethods.some(
                (pm) => pm.id === subDefaultPmId,
              );

              if (!alreadyInList) {
                try {
                  const subDefaultPm = await stripe.paymentMethods.retrieve(
                    subDefaultPmId,
                    { expand: ["card"] },
                  );
                  // Add subscription default payment method if not already in list
                  paymentMethods.unshift(subDefaultPm);
                } catch (error) {
                  console.error(
                    "Failed to retrieve subscription default payment method:",
                    error,
                  );
                }
              }

              // Use subscription's default if customer doesn't have one set
              if (!defaultPaymentMethodId) {
                defaultPaymentMethodId = subDefaultPmId;
              }
            }
          } catch (error) {
            console.error("Failed to retrieve subscription:", error);
          }
        }
      }
    } catch (error) {
      console.error("Failed to retrieve customer:", error);
    }

    // Format payment methods for response
    const formattedPaymentMethods = paymentMethods.map((pm) => {
      const isDefault = pm.id === defaultPaymentMethodId;

      // Check if payment method has card details (card, cartes_bancaires, etc.)
      // Some payment method types may have card details even if type !== "card"
      if (pm.card?.last4) {
        return {
          id: pm.id,
          type: pm.type,
          card: {
            brand: pm.card.brand || "unknown",
            last4: pm.card.last4,
            expMonth: pm.card.exp_month || 0,
            expYear: pm.card.exp_year || 0,
          },
          cardholderName: pm.billing_details?.name || null,
          isDefault,
        };
      }

      // Non-card payment method (e.g., Link, bank_account, etc.)
      return {
        id: pm.id,
        type: pm.type,
        card: undefined,
        cardholderName: pm.billing_details?.name || null,
        isDefault,
      };
    });

    return NextResponse.json(
      { paymentMethods: formattedPaymentMethods },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get payment methods error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment methods" },
      { status: 500 },
    );
  }
}
