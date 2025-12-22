"use client";

import { CreditCard, Download, ExternalLink, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const currentPlan = subscription?.plan || "free";
  const planConfig = PLAN_CONFIGS[currentPlan];

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
          <CardDescription>
            Your current plan and billing information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{planConfig.name}</p>
              <p className="text-sm text-muted-foreground">
                {currentPlan === "free"
                  ? "Free forever"
                  : formatCurrency(planConfig.price)}
                /month
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  subscription?.status === "active" ? "default" : "secondary"
                }
              >
                {subscription?.status || "active"}
              </Badge>
              {invoices.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing}
                >
                  {syncing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    "Sync Subscription"
                  )}
                </Button>
              )}
            </div>
          </div>

          {subscription?.currentPeriodEnd && (
            <div className="text-sm text-muted-foreground">
              {subscription.status === "canceled" ? "Expires" : "Renews"} on{" "}
              {formatDate(subscription.currentPeriodEnd)}
            </div>
          )}

          <div className="grid gap-2">
            {planConfig.features.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm">
                <span className="text-green-500">✓</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plan Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Change Plan</CardTitle>
          <CardDescription>
            Upgrade or downgrade your subscription plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {(["free", "starter", "growth", "enterprise"] as PlanType[]).map(
              (plan) => {
                const config = PLAN_CONFIGS[plan];
                const isCurrent = currentPlan === plan;
                const isUpgrade =
                  plan !== "free" &&
                  (currentPlan === "free" ||
                    (plan === "growth" && currentPlan === "starter") ||
                    plan === "enterprise");

                return (
                  <Card
                    key={plan}
                    className={
                      isCurrent
                        ? "border-primary ring-2 ring-primary"
                        : "border-border"
                    }
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                      <CardDescription>
                        {plan === "free" ? (
                          "Free"
                        ) : (
                          <>
                            {formatCurrency(config.price)}
                            <span className="text-xs">/month</span>
                          </>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2 text-sm">
                        {config.features.slice(0, 4).map((feature) => (
                          <li key={feature} className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      {isCurrent ? (
                        <Button disabled variant="outline" className="w-full">
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
                          className="w-full"
                        >
                          {processing === `checkout-${plan}` ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            "Upgrade"
                          )}
                        </Button>
                      ) : (
                        <Button variant="outline" disabled className="w-full">
                          Downgrade
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              },
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>
            Manage your payment methods for subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentMethods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payment methods on file</p>
              <p className="text-sm mt-2">
                Add a payment method when upgrading your plan
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <CreditCard className="h-6 w-6 text-muted-foreground" />
                    <div>
                      {pm.card?.last4 ? (
                        <>
                          <p className="font-medium">
                            {pm.cardholderName
                              ? `${pm.cardholderName} •••• ${pm.card.last4}`
                              : `Card •••• ${pm.card.last4}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatBrandName(pm.card.brand)}
                            {pm.card.expMonth && pm.card.expYear
                              ? ` • Expires ${String(pm.card.expMonth).padStart(2, "0")}/${pm.card.expYear}`
                              : ""}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium">
                            {pm.cardholderName ||
                              formatPaymentMethodType(pm.type)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatPaymentMethodType(pm.type)} payment method
                          </p>
                        </>
                      )}
                    </div>
                    {pm.isDefault && <Badge variant="secondary">Default</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>
            View and download your past invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No invoices found</EmptyTitle>
                <EmptyDescription>
                  Invoices will appear here once you have a paid subscription
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {invoice.number || invoice.id}
                      </p>
                      <Badge
                        variant={
                          invoice.status === "paid"
                            ? "default"
                            : invoice.status === "open"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(invoice.created)} •{" "}
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
