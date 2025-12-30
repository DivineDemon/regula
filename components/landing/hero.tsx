"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Shield, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroVideoDialog } from "@/components/ui/hero-video-dialog";
import DarkVeil from "../ui/dark-veil";

export function Hero() {
  return (
    <section className="relative overflow-hidden min-h-screen">
      <div className="absolute inset-0 z-0">
        <DarkVeil />
      </div>

      <div className="relative z-10 container mx-auto px-4 text-center pt-24 pb-32 md:pt-36 md:pb-48">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border bg-background/50 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-muted-foreground mb-8"
        >
          <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
          AI-Powered Regulatory Intelligence for Emerging Markets
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl md:text-6xl lg:text-7xl font-bold font-heading tracking-tight mb-6"
        >
          Automate Compliance. <br className="hidden md:block" />
          <span className="text-foreground">Stay Ahead of Regulation.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed"
        >
          Stop manually checking regulator websites. Regula provides real-time
          monitoring, AI-powered impact analysis, and instant alerts for
          FinTechs in emerging markets.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center justify-center mb-8"
        >
          <Link href="/register">
            <Button
              size="lg"
              className="h-12 px-8 text-base shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground mb-8"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>GDPR Compliant</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
            <Shield className="h-4 w-4 text-primary" />
            <span>SOC 2 Ready</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
            <Zap className="h-4 w-4 text-primary" />
            <span>Real-time Updates</span>
          </div>
        </motion.div>

        {/* Hero Video Dialog */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="w-full max-w-5xl mx-auto"
        >
          <HeroVideoDialog
            videoSrc="https://www.youtube.com/embed/dQw4w9WgXcQ"
            thumbnailSrc="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop"
            thumbnailAlt="Regula Demo Video"
            animationStyle="from-center"
            className="w-full"
          />
        </motion.div>
      </div>
    </section>
  );
}
