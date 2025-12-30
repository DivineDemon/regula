"use client";

import { motion } from "framer-motion";
import { Check, Minus, X } from "lucide-react";
import { comparisons } from "@/lib/constants";

export function Comparison() {
  return (
    <section
      id="comparison"
      className="w-full relative flex flex-col max-w-7xl mx-auto border-x"
    >
      <div className="w-full px-6">
        <div className="w-full border-x flex flex-col items-center justify-center">
          <motion.div
            className="border-b w-full p-10 md:p-14"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: false, margin: "-100px" }}
          >
            <div className="max-w-xl mx-auto flex flex-col items-center justify-center gap-2">
              <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-center text-balance pb-1">
                Why Choose Regula Over Competitors
              </h2>
              <p className="text-muted-foreground text-center text-balance font-medium">
                See how Regula compares to leading regulatory compliance
                platforms. Built for speed, affordability, and emerging markets.
              </p>
            </div>
          </motion.div>
          <div className="overflow-x-auto w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: false, margin: "-100px" }}
              className="min-w-[800px] rounded-xl w-full"
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
                  {comparisons.map((row, index) => (
                    <motion.tr
                      key={row.feature}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      viewport={{ once: false, margin: "-100px" }}
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
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </div>
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
