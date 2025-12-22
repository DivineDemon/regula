import Stripe from "stripe";

/**
 * Plan configuration with limits and pricing
 * These can be imported client-side without initializing the Stripe client
 */
export type PlanType = "free" | "starter" | "growth" | "enterprise";

export interface PlanConfig {
  name: string;
  priceId?: string; // Stripe Price ID for monthly subscription
  price: number; // Monthly price in cents
  targets: number; // Maximum number of targets
  crawlFrequency: string; // Minimum crawl frequency (hourly, daily, weekly, monthly)
  retentionDays: number; // Data retention in days
  realTimeAlerts: boolean; // Real-time alerts vs digest only
  features: string[];
}

export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  free: {
    name: "Free",
    price: 0,
    targets: 3,
    crawlFrequency: "daily",
    retentionDays: 90, // 3 months
    realTimeAlerts: false,
    features: [
      "3 targets",
      "Daily crawls",
      "Daily digest emails",
      "3-month data retention",
    ],
  },
  starter: {
    name: "Starter",
    priceId: process.env.STRIPE_PRICE_ID_STARTER, // Set in env
    price: 3900, // $39/month in cents
    targets: 10,
    crawlFrequency: "hourly",
    retentionDays: 365, // 1 year
    realTimeAlerts: false,
    features: [
      "10 targets",
      "Hourly crawls",
      "Daily digest emails",
      "1-year data retention",
    ],
  },
  growth: {
    name: "Growth",
    priceId: process.env.STRIPE_PRICE_ID_GROWTH, // Set in env
    price: 12900, // $129/month in cents
    targets: 50,
    crawlFrequency: "hourly",
    retentionDays: 1095, // 3 years
    realTimeAlerts: true,
    features: [
      "50 targets",
      "Hourly crawls",
      "Real-time alerts",
      "3-year data retention",
    ],
  },
  enterprise: {
    name: "Enterprise",
    priceId: process.env.STRIPE_PRICE_ID_ENTERPRISE, // Set in env
    price: 49900, // $499/month in cents (base)
    targets: Infinity, // Unlimited
    crawlFrequency: "hourly",
    retentionDays: Infinity, // 5+ years (effectively unlimited)
    realTimeAlerts: true,
    features: [
      "Unlimited targets",
      "Hourly crawls",
      "Real-time alerts",
      "5+ year data retention",
      "Priority support",
      "Custom features",
    ],
  },
};

/**
 * Get Stripe client instance (lazy initialization)
 * This is only initialized when actually used, allowing PLAN_CONFIGS
 * to be imported client-side without errors
 */
function getStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY must be set in environment variables");
  }

  // Lazy initialization - only create client when needed
  // Use globalThis in Node.js environment to cache across hot reloads in dev
  const globalForStripe = globalThis as typeof globalThis & {
    stripeClient?: Stripe;
  };

  if (!globalForStripe.stripeClient) {
    globalForStripe.stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    });
  }

  return globalForStripe.stripeClient;
}

/**
 * Stripe client instance (lazy initialized)
 * Only initialized when actually accessed, allowing PLAN_CONFIGS
 * to be imported client-side without triggering initialization
 */
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getStripeClient()[prop as keyof Stripe];
  },
});

/**
 * Stripe service helper functions
 */
export const stripeService = {
  /**
   * Create a Stripe customer
   */
  async createCustomer({
    email,
    name,
    metadata,
  }: {
    email: string;
    name?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Customer> {
    return getStripeClient().customers.create({
      email,
      name,
      metadata,
    });
  },

  /**
   * Create a subscription for a customer
   */
  async createSubscription({
    customerId,
    priceId,
    metadata,
  }: {
    customerId: string;
    priceId: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Subscription> {
    return getStripeClient().subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata,
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
    });
  },

  /**
   * Update a subscription (change plan)
   */
  async updateSubscription({
    subscriptionId,
    priceId,
    prorationBehavior = "create_prorations",
  }: {
    subscriptionId: string;
    priceId: string;
    prorationBehavior?: "create_prorations" | "none" | "always_invoice";
  }): Promise<Stripe.Subscription> {
    const client = getStripeClient();
    const subscription = await client.subscriptions.retrieve(subscriptionId);

    return client.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: priceId,
        },
      ],
      proration_behavior: prorationBehavior,
    });
  },

  /**
   * Cancel a subscription
   */
  async cancelSubscription({
    subscriptionId,
    cancelImmediately = false,
  }: {
    subscriptionId: string;
    cancelImmediately?: boolean;
  }): Promise<Stripe.Subscription> {
    const client = getStripeClient();
    if (cancelImmediately) {
      return client.subscriptions.cancel(subscriptionId);
    }

    return client.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  },

  /**
   * Resume a canceled subscription
   */
  async resumeSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    return getStripeClient().subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  },

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession({
    customerId,
    priceId,
    successUrl,
    cancelUrl,
    metadata,
  }: {
    customerId?: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    return getStripeClient().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    });
  },

  /**
   * Create a billing portal session
   */
  async createBillingPortalSession({
    customerId,
    returnUrl,
  }: {
    customerId: string;
    returnUrl: string;
  }): Promise<Stripe.BillingPortal.Session> {
    return getStripeClient().billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  },

  /**
   * Get customer's payment methods
   */
  async getPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const paymentMethods = await getStripeClient().paymentMethods.list({
      customer: customerId,
      type: "card",
    });
    return paymentMethods.data;
  },

  /**
   * Get invoices for a customer
   */
  async getInvoices(customerId: string, limit = 10): Promise<Stripe.Invoice[]> {
    const invoices = await getStripeClient().invoices.list({
      customer: customerId,
      limit,
    });
    return invoices.data;
  },

  /**
   * Retrieve an invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    return getStripeClient().invoices.retrieve(invoiceId);
  },
};
