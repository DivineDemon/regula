/**
 * Source of truth for Regula plan tiers and limits.
 *
 * Keep this module Stripe-agnostic except for `priceId` fields that are used
 * by billing flows. All plan / quota / retention logic should import from here.
 */
export type PlanType = "free" | "starter" | "growth" | "enterprise";

export type CrawlFrequency = "hourly" | "daily" | "weekly" | "monthly";

export interface PlanConfig {
  name: string;
  /**
   * Stripe Price ID for monthly subscription (if paid plan).
   * This must be safe to import on the client.
   */
  priceId?: string;
  /** Monthly price in cents. */
  price: number;
  /** Maximum number of targets. Use `Infinity` for unlimited. */
  targets: number;
  /** Maximum allowed crawl frequency for the plan. */
  crawlFrequency: CrawlFrequency;
  /** Maximum crawls per month. `undefined` means unlimited. */
  crawlQuota?: number;
  /** Maximum storage in bytes. `undefined` means unlimited. */
  storageQuota?: number;
  /** Retention window in days. Use `Infinity` for unlimited. */
  retentionDays: number;
  /** Whether the plan includes real-time alerts (vs digest-only). */
  realTimeAlerts: boolean;
  /** Display feature bullets. */
  features: string[];
  /** Short landing-page line: who the tier is for (marketing only). */
  whoItsFor: string;
  /** Support response guarantee (e.g. "48h response", "24h response", "Priority support"). */
  supportGuarantee?: string;
}

export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  free: {
    name: "Free",
    price: 0,
    targets: 3,
    crawlFrequency: "daily",
    crawlQuota: 90, // 3 targets × 1 crawl/day × 30 days
    storageQuota: 1 * 1024 * 1024 * 1024, // 1GB
    retentionDays: 30, // 30 days (aligned with business-model.md)
    realTimeAlerts: false,
    features: [
      "3 targets",
      "Daily crawls",
      "Daily digest emails",
      "30-day data retention",
    ],
    whoItsFor: "Prove value with daily monitoring before you scale.",
    supportGuarantee: "Email support, 48h response",
  },
  starter: {
    name: "Starter",
    priceId: process.env.STRIPE_PRICE_ID_STARTER,
    price: 3900, // $39/mo
    targets: 10,
    crawlFrequency: "hourly",
    crawlQuota: 7200, // 10 targets × 24/day × 30 days
    storageQuota: 10 * 1024 * 1024 * 1024, // 10GB
    retentionDays: 365, // 1 year
    realTimeAlerts: false,
    features: [
      "10 targets",
      "Hourly crawls",
      "Daily digest emails",
      "1-year data retention",
    ],
    whoItsFor:
      "Best first paid step for small teams operationalizing coverage.",
    supportGuarantee: "Email support, 24h response",
  },
  growth: {
    name: "Growth",
    priceId: process.env.STRIPE_PRICE_ID_GROWTH,
    price: 12900, // $129/mo
    targets: 50,
    crawlFrequency: "hourly",
    crawlQuota: 36000, // 50 targets × 24/day × 30 days
    storageQuota: 100 * 1024 * 1024 * 1024, // 100GB
    retentionDays: 1095, // 3 years
    realTimeAlerts: true,
    features: [
      "50 targets",
      "Hourly crawls",
      "Real-time alerts",
      "3-year data retention",
    ],
    whoItsFor: "Real-time alerting and deeper retention as operations grow.",
    supportGuarantee: "Email support, 24h response",
  },
  enterprise: {
    name: "Enterprise",
    priceId: process.env.STRIPE_PRICE_ID_ENTERPRISE,
    price: 49900, // $499/mo base
    targets: Infinity,
    crawlFrequency: "hourly",
    // crawlQuota/storageQuota undefined = unlimited
    retentionDays: Infinity,
    realTimeAlerts: true,
    features: [
      "Unlimited targets",
      "Hourly crawls",
      "Real-time alerts",
      "Unlimited data retention",
      "Priority support",
      "Custom features",
    ],
    whoItsFor: "Unlimited scale, dedicated support, and customization.",
    supportGuarantee: "Dedicated success manager, 4h SLA",
  },
};

/**
 * Validate whether a requested crawl frequency is allowed for a plan.
 * Users can pick a frequency that is less frequent (or equal) than the plan allows.
 */
export function isCrawlFrequencyAllowed(
  plan: PlanType,
  requested: CrawlFrequency,
): boolean {
  const allowed = PLAN_CONFIGS[plan].crawlFrequency;

  const order: Record<CrawlFrequency, number> = {
    hourly: 4,
    daily: 3,
    weekly: 2,
    monthly: 1,
  };

  return order[requested] <= order[allowed];
}

export function getPlanConfig(plan: PlanType): PlanConfig {
  return PLAN_CONFIGS[plan];
}
