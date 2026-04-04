"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function FeaturesIntroMotion({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="border-b w-full p-10 md:p-14"
      initial={false}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: false, margin: "-100px" }}
    >
      {children}
    </motion.div>
  );
}

export function FeatureCardMotion({
  children,
  index,
}: {
  children: ReactNode;
  index: number;
}) {
  return (
    <motion.div
      initial={false}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: false, margin: "-100px" }}
      className="w-full h-full last:border-t lg:last:border-t-0 lg:border-r even:border-r-0 border-b nth-5:border-b-0 nth-6:border-b-0 hover:bg-muted/30 transition-colors group"
    >
      {children}
    </motion.div>
  );
}
