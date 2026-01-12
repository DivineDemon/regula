"use client";

import {
  CircleCheck,
  CreditCard,
  Download,
  ExternalLink,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { PLAN_CONFIGS, type PlanType } from "@/lib/services/stripe";

interface Subscription {
  id: string;
  plan: PlanType;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  cardholderName?: string | null;
  isDefault?: boolean;
}

interface Invoice {
  id: string;
  number: string | null;
  amount: number;
  currency: string;
  status: string;
  created: number;
  dueDate: number | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
}

// Helper function to format payment method type names
function formatPaymentMethodType(type: string): string {
  const typeMap: Record<string, string> = {
    card: "Card",
    link: "Link",
    cartes_bancaires: "Cartes Bancaires",
    bank_account: "Bank Account",
    sepa_debit: "SEPA Debit",
    us_bank_account: "US Bank Account",
  };

  return (
    typeMap[type] ||
    type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

// Helper function to format card brand names
function formatBrandName(brand: string): string {
  const brandMap: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
    diners: "Diners Club",
    jcb: "JCB",
    unionpay: "UnionPay",
    cartes_bancaires: "Cartes Bancaires",
  };

  return brandMap[brand.toLowerCase()] || brand.toUpperCase();
}

export function BillingClient({
  organizationId,
  organizationName: _organizationName,
}: {
  organizationId: string;
  organizationName: string;
}) {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const fetchBillingData = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, pmRes, invRes] = await Promise.all([
        fetch(`/api/billing/subscription?organizationId=${organizationId}`),
        fetch(`/api/billing/payment-methods?organizationId=${organizationId}`),
        fetch(`/api/billing/invoices?organizationId=${organizationId}`),
      ]);

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData.subscription);
      }

      if (pmRes.ok) {
        const pmData = await pmRes.json();
        setPaymentMethods(pmData.paymentMethods || []);
      }

      if (invRes.ok) {
        const invData = await invRes.json();
        setInvoices(invData.invoices || []);
      }
    } catch (error) {
      console.error("Error fetching billing data:", error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/billing/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to sync subscription");
      }

      const data = await response.json();
      toast.success(`Subscription synced successfully! Plan: ${data.plan}`);
      // Refresh billing data
      await fetchBillingData();
    } catch (error) {
      console.error("Sync error:", error);
      const message =
        error instanceof Error ? error.message : "Failed to sync subscription";
      toast.error(message);
    } finally {
      setSyncing(false);
    }
  };

  const handleCheckout = async (plan: "starter" | "growth" | "enterprise") => {
    setProcessing(`checkout-${plan}`);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          plan,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error || "Failed to create checkout session";
        console.error("Checkout API error:", errorMessage, errorData);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to start checkout. Please try again.";
      toast.error(message);
    } finally {
      setProcessing(null);
    }
  };

  const formatCurrency = (amount: number, currency: string = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100); // Stripe amounts are in cents
  };

  const formatDate = (date: string | number | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const currentPlan = subscription?.plan || "free";

  // Plan hierarchy for upgrade/downgrade logic
  const planHierarchy: PlanType[] = ["free", "starter", "growth", "enterprise"];
  const getPlanIndex = (plan: PlanType) => planHierarchy.indexOf(plan);

  const handleDowngrade = async (plan: PlanType) => {
    setProcessing(`downgrade-${plan}`);
    try {
      const response = await fetch("/api/billing/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          plan,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to update subscription";
        console.error("Downgrade API error:", errorMessage, errorData);
        throw new Error(errorMessage);
      }

      toast.success(`Plan updated successfully to ${PLAN_CONFIGS[plan].name}`);
      // Refresh billing data
      await fetchBillingData();
    } catch (error) {
      console.error("Downgrade error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update plan. Please try again.";
      toast.error(message);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col items-start justify-start gap-5">
        <div className="w-full flex items-center justify-center">
          <Skeleton className="h-8 w-32" />
          <div className="flex-1" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="w-full grid grid-cols-4 items-start justify-start gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="relative col-span-1 flex h-full w-full flex-col items-start justify-start gap-5 rounded-2xl border p-5 shadow"
            >
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-4 w-full" />
              <div className="flex w-full flex-col items-center justify-center gap-2.5">
                {[1, 2, 3, 4].map((j) => (
                  <div
                    key={j}
                    className="flex w-full items-center justify-center gap-2.5"
                  >
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-10 w-full mt-auto" />
            </div>
          ))}
        </div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-start justify-start gap-5">
      <div className="w-full flex items-center justify-center">
        <span className="flex-1 text-left text-2xl font-semibold">Plans</span>
        {invoices.length > 0 && (
          <Button
            variant="default"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="animate-spin" />
            ) : (
              "Sync Subscription"
            )}
          </Button>
        )}
      </div>
      <div className="w-full grid grid-cols-4 items-start justify-start gap-5">
        {(["free", "starter", "growth", "enterprise"] as PlanType[]).map(
          (plan) => {
            const config = PLAN_CONFIGS[plan];
            const isCurrent = currentPlan === plan;
            const currentPlanIndex = getPlanIndex(currentPlan);
            const planIndex = getPlanIndex(plan);
            const isUpgrade = planIndex > currentPlanIndex;
            const isDowngrade = planIndex < currentPlanIndex;

            return (
              <div
                key={plan}
                className="relative col-span-1 flex h-full w-full flex-col items-start justify-start gap-5 rounded-2xl border p-5 shadow border-primary bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(43,127,255,0.1),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(43,127,255,0.3),rgba(255,255,255,0))]"
              >
                {isCurrent && (
                  <div className="w-full absolute -top-[13px] right-0">
                    <div className="mx-auto w-fit rounded-full bg-primary px-3 pb-0.5">
                      <span className="w-fit text-center text-[12px] text-white leading-[14px]">
                        Active
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex w-full flex-col items-center justify-center gap-2">
                  <span className="w-full text-left font-semibold text-[18px] leading-[18px]">
                    {config.name}
                  </span>
                  <span className="w-full text-left text-[14px] text-muted-foreground leading-[14px]">
                    Expand with confidence.
                  </span>
                </div>
                <span className="w-full text-left font-bold text-[36px] leading-[36px]">
                  {formatCurrency(config.price)}
                  <span className="text-[14px] text-muted-foreground leading-[14px]">
                    &nbsp;/&nbsp;m
                  </span>
                </span>
                <span className="w-full text-left text-[14px] text-muted-foreground leading-[14px]">
                  Offers extended features and higher limits.
                </span>
                <div className="flex w-full flex-col items-center justify-center gap-2.5">
                  {config.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex w-full items-center justify-center gap-2.5"
                    >
                      <CircleCheck className="size-4 text-primary" />
                      <span className="flex-1 text-left text-[14px] capitalize leading-[14px]">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
                {isCurrent ? (
                  <Button disabled variant="default" className="w-full mt-auto">
                    Current Plan
                  </Button>
                ) : isUpgrade ? (
                  <Button
                    onClick={() =>
                      handleCheckout(
                        plan as "starter" | "growth" | "enterprise",
                      )
                    }
                    disabled={!!processing}
                    className="w-full mt-auto"
                  >
                    {processing === `checkout-${plan}` ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      "Upgrade"
                    )}
                  </Button>
                ) : isDowngrade ? (
                  <Button
                    onClick={() => handleDowngrade(plan)}
                    disabled={!!processing}
                    variant="outline"
                    className="w-full mt-auto"
                  >
                    {processing === `downgrade-${plan}` ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      "Downgrade"
                    )}
                  </Button>
                ) : null}
              </div>
            );
          },
        )}
      </div>
      {paymentMethods.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TriangleAlert className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No payment methods on file</EmptyTitle>
            <EmptyDescription>
              Add a payment method when upgrading your plan
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="w-full grid grid-cols-3 items-start justify-start gap-5">
          <span className="w-full col-span-3 text-left text-2xl font-semibold">
            Payment Methods
          </span>
          {paymentMethods.map((pm) => (
            <div
              key={pm.id}
              className="w-full flex items-center justify-between rounded-lg border p-4 gap-2.5"
            >
              <div className="size-11 rounded-full bg-primary/20 text-primary p-3">
                <CreditCard className="size-full" />
              </div>
              <div className="flex-1 flex flex-col items-start justify-start">
                {pm.card?.last4 ? (
                  <>
                    <p className="w-full text-left font-medium">
                      {`•••• •••• •••• ${pm.card.last4}`}
                    </p>
                    <p className="w-full text-left text-sm text-muted-foreground">
                      {formatBrandName(pm.card.brand)}
                      {pm.card.expMonth && pm.card.expYear
                        ? ` • Expires ${String(pm.card.expMonth).padStart(
                            2,
                            "0",
                          )}/${pm.card.expYear}`
                        : ""}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="w-full text-left font-medium">
                      {pm.cardholderName || formatPaymentMethodType(pm.type)}
                    </p>
                    <p className="w-full text-left text-sm text-muted-foreground">
                      {formatPaymentMethodType(pm.type)} payment method
                    </p>
                  </>
                )}
              </div>
              {pm.isDefault && <Badge variant="default">Default</Badge>}
            </div>
          ))}
        </div>
      )}
      <div className="w-full flex flex-col items-start justify-start gap-5">
        <span className="w-full text-left text-2xl font-semibold">
          Invoice History
        </span>
        {invoices.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TriangleAlert className="size-6" />
              </EmptyMedia>
              <EmptyTitle>No invoices found</EmptyTitle>
              <EmptyDescription>
                Invoices will appear here once you have a paid subscription
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="w-full flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{invoice.number || invoice.id}</p>
                  <Badge
                    variant={
                      invoice.status === "paid"
                        ? "default"
                        : invoice.status === "open"
                          ? "secondary"
                          : "destructive"
                    }
                    className="capitalize"
                  >
                    {invoice.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(invoice.created)} •&nbsp;
                  {formatCurrency(invoice.amount, invoice.currency)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {invoice.invoicePdf && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (invoice.invoicePdf) {
                        window.open(invoice.invoicePdf, "_blank");
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                )}
                {invoice.hostedInvoiceUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (invoice.hostedInvoiceUrl) {
                        window.open(invoice.hostedInvoiceUrl, "_blank");
                      }
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
