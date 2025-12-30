"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function CTA() {
  return (
    <section className="w-full flex flex-col max-w-7xl mx-auto border-x">
      <motion.div
        className="w-full rounded-3xl bg-primary overflow-hidden relative"
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: false, margin: "-100px" }}
      >
        <Image
          src="/agent-cta-background.webp"
          alt="Regula Regulatory Compliance Platform - Start Your Free Trial"
          className="w-full z-0"
          width={1000}
          height={1000}
        />
        <div className="absolute inset-0 -top-32 md:-top-40 flex flex-col items-center justify-center">
          <motion.h1
            className="text-white text-4xl md:text-7xl font-medium tracking-tighter max-w-xs md:max-w-xl text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: false, margin: "-100px" }}
          >
            Automate. Simplify. Thrive
          </motion.h1>
          <motion.div
            className="absolute bottom-10 flex flex-col items-center justify-center gap-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: false, margin: "-100px" }}
          >
            <a
              className="bg-white text-black font-semibold text-sm h-10 w-fit px-4 rounded-full flex items-center justify-center shadow-md hover:bg-white/90 transition-colors"
              href="/register"
            >
              Start Your 14-Day Free Trial Today
            </a>
            <span className="text-white text-sm">
              Cancel anytime, no questions asked
            </span>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
