"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShimmerButton } from "@/components/ui/shimmer-button";

export function CTA() {
  return (
    <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-[100px] -translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="container mx-auto px-4 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl"
        >
          <h2 className="text-3xl font-bold font-heading sm:text-4xl lg:text-5xl mb-6">
            Ready to Automate your Compliance?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-10 leading-relaxed">
            Join FinTech teams across emerging markets who trust Regula to keep
            them compliant. Start your free trial today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <ShimmerButton
                className="h-14 px-8 text-lg shadow-xl"
                shimmerColor="rgba(255, 255, 255, 0.5)"
                background="hsl(var(--secondary))"
                borderRadius="0.5rem"
              >
                <span className="text-secondary-foreground font-semibold">
                  Start Free Trial
                </span>
                <ArrowRight className="ml-2 h-5 w-5 text-secondary-foreground" />
              </ShimmerButton>
            </Link>
            <Link href="#contact">
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent"
              >
                Contact Sales
              </Button>
            </Link>
          </div>
          <p className="mt-8 text-sm opacity-75">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </motion.div>
      </div>
    </section>
  );
}
