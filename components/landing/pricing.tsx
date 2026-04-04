"use client";

import { motion } from "framer-motion";
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
        <motion.div
          className="max-w-2xl mx-auto flex flex-col items-center justify-center gap-2 text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-balance pb-1">
            Pricing That Scales With Compliance Maturity
          </h2>
          <p className="text-muted-foreground text-balance font-medium">
            Start with essential coverage. Upgrade to real-time intelligence and
            deeper retention as your operations grow.
          </p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {PLAN_ORDER.map((planType, index) => {
            const config = PLAN_CONFIGS[planType];
            const isStarter = planType === "starter";
            const isFree = planType === "free";

            return (
              <motion.div
                key={planType}
                className={`rounded-xl border p-6 flex flex-col ${
                  isStarter
                    ? "border-2 border-primary bg-primary/5 shadow-lg"
                    : "bg-card"
                }`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                viewport={{ once: true, margin: "-50px" }}
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
              </motion.div>
            );
          })}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Enterprise includes dedicated success manager and custom features
          —&nbsp;
          <Link
            href="#contact"
            className="text-primary font-medium underline underline-offset-2"
          >
            contact us
          </Link>
        </p>
      </div>
    </section>
  );
}
