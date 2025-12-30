"use client";

import { motion } from "framer-motion";
import { Check, Minus, X } from "lucide-react";

const comparisons = [
  {
    feature: "SMB Friendly Pricing",
    regula: true,
    regology: false,
    corlytics: false,
    gnowit: "partial",
  },
  {
    feature: "Emerging Market Coverage",
    regula: true,
    regology: false,
    corlytics: false,
    gnowit: false,
  },
  {
    feature: "Real-Time Crawling",
    regula: true,
    regology: true,
    corlytics: "partial",
    gnowit: true,
  },
  {
    feature: "AI Impact Scoring",
    regula: true,
    regology: "partial",
    corlytics: true,
    gnowit: "partial",
  },
  {
    feature: "Setup Time",
    regula: "< 15 mins",
    regology: "Weeks",
    corlytics: "Months",
    gnowit: "Days",
  },
];

export function Comparison() {
  return (
    <section id="comparison" className="py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 className="text-3xl font-bold font-heading sm:text-4xl mb-4">
            Why Choose Regula?
          </h2>
          <p className="text-lg text-muted-foreground">
            See how we stack up against traditional enterprise compliance
            platforms.
          </p>
        </div>

        <div className="overflow-x-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="min-w-[800px] rounded-xl border bg-card text-card-foreground shadow-sm"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 text-left font-medium text-muted-foreground w-1/4">
                    Feature
                  </th>
                  <th className="p-4 text-center font-bold text-primary w-1/5 bg-primary/5">
                    Regula
                  </th>
                  <th className="p-4 text-center font-medium text-muted-foreground w-1/5">
                    Regology
                  </th>
                  <th className="p-4 text-center font-medium text-muted-foreground w-1/5">
                    Corlytics
                  </th>
                  <th className="p-4 text-center font-medium text-muted-foreground w-1/5">
                    Gnowit
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b last:border-0 hover:bg-muted/5 transition-colors"
                  >
                    <td className="p-4 font-medium">{row.feature}</td>
                    <td className="p-4 text-center bg-primary/5 shadow-[inset_0_0_20px_rgba(0,0,0,0.02)]">
                      {renderValue(row.regula, true)}
                    </td>
                    <td className="p-4 text-center">
                      {renderValue(row.regology)}
                    </td>
                    <td className="p-4 text-center">
                      {renderValue(row.corlytics)}
                    </td>
                    <td className="p-4 text-center">
                      {renderValue(row.gnowit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function renderValue(value: boolean | string, isPrimary = false) {
  if (value === true) {
    return (
      <div className="flex justify-center">
        <Check
          className={`h-5 w-5 ${isPrimary ? "text-primary" : "text-green-500"}`}
        />
      </div>
    );
  }
  if (value === false) {
    return (
      <div className="flex justify-center">
        <X className="h-5 w-5 text-muted-foreground/50" />
      </div>
    );
  }
  if (value === "partial") {
    return (
      <div className="flex justify-center">
        <Minus className="h-5 w-5 text-yellow-500" />
      </div>
    );
  }
  return (
    <span
      className={isPrimary ? "font-bold text-primary" : "text-muted-foreground"}
    >
      {value}
    </span>
  );
}
