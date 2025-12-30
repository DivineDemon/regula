"use client";

import { motion } from "framer-motion";
import { NumberTicker } from "@/components/ui/number-ticker";

type Stat =
  | { value: string; label: string; isNumber: false }
  | {
      value: number;
      label: string;
      isNumber: true;
      suffix?: string;
      decimalPlaces?: number;
    };

const stats: Stat[] = [
  { value: "24/7", label: "Continuous Monitoring", isNumber: false },
  {
    value: 99.9,
    label: "Uptime Guarantee",
    suffix: "%",
    isNumber: true,
    decimalPlaces: 1,
  },
  { value: "<5min", label: "Alert Delivery Time", isNumber: false },
  { value: 50, label: "Regulatory Sources", suffix: "+", isNumber: true },
];

export function Stats() {
  return (
    <section className="w-full flex flex-col py-14 max-w-7xl bg-muted/30 mx-auto border-x">
      <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            viewport={{ once: false, margin: "-100px" }}
            className="text-center"
          >
            <div className="text-3xl font-bold font-heading text-primary sm:text-4xl">
              {stat.isNumber ? (
                <>
                  <NumberTicker
                    value={stat.value}
                    className="text-3xl font-bold font-heading text-primary sm:text-4xl"
                    decimalPlaces={stat.decimalPlaces ?? 0}
                  />
                  {stat.suffix}
                </>
              ) : (
                stat.value
              )}
            </div>
            <div className="mt-2 text-sm font-medium text-muted-foreground">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
