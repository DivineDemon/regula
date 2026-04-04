import { Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PLAN_CONFIGS, type PlanType } from "@/lib/plans";

function formatPrice(cents: number): string {
  if (cents === 0) return "$0";
  return `$${Math.round(cents / 100)}`;
}

const PLAN_ORDER: PlanType[] = ["free", "starter", "growth", "enterprise"];

export function Pricing() {
  return (
    <section
      id="pricing"
      className="w-full relative flex flex-col max-w-7xl mx-auto border-x bg-muted/30"
    >
      <div className="w-full px-6 py-14 md:py-20">
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center gap-2 text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-balance pb-1">
            Pricing That Scales With Compliance Maturity
          </h2>
          <p className="text-muted-foreground text-balance font-medium">
            Limits and quotas match what you see at checkout and in Settings →
            Billing. Upgrade when you need hourly crawls, real-time alerts, or
            longer retention.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {PLAN_ORDER.map((planType) => {
            const config = PLAN_CONFIGS[planType];
            const isStarter = planType === "starter";
            const isFree = planType === "free";

            return (
              <div
                key={planType}
                className={`rounded-xl border p-6 flex flex-col ${
                  isStarter
                    ? "border-2 border-primary bg-primary/5 shadow-lg"
                    : "bg-card"
                }`}
              >
                {isStarter && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium bg-primary text-primary-foreground px-2 py-0.5 rounded">
                      Popular
                    </span>
                  </div>
                )}
                <h3 className="text-lg font-semibold">{config.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-snug">
                  {config.whoItsFor}
                </p>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-bold">
                    {formatPrice(config.price)}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-2 flex-1">
                  {config.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  variant={isFree ? "outline" : "default"}
                  className="mt-6 w-full"
                >
                  <Link href="/register">
                    {isFree
                      ? "Get started free"
                      : "Start free, upgrade anytime"}
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-6 max-w-xl mx-auto">
          No separate setup fee on self-serve plans. Enterprise includes a
          dedicated success manager and custom options—&nbsp;
          <Link
            href="#contact"
            className="text-primary font-medium underline underline-offset-2"
          >
            contact us
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
