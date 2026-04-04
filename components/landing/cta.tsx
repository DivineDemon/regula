"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const primaryCta = "Start free — monitor 3 targets today";
const supportText = "No credit card required";

export function CTA() {
  return (
    <section className="w-full flex flex-col max-w-7xl mx-auto border-x">
      {/* Mobile & tablet: compact conversion block */}
      <div className="w-full px-4 py-8 sm:px-6 md:py-10 xl:hidden">
        <motion.div
          className="w-full rounded-2xl sm:rounded-3xl bg-primary px-6 py-10 sm:px-8 sm:py-12 flex flex-col items-center justify-center text-center gap-5 relative overflow-hidden"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: false, margin: "-80px" }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, white 0%, transparent 45%), radial-gradient(circle at 80% 80%, white 0%, transparent 40%)",
            }}
            aria-hidden
          />
          <h2 className="relative z-1 text-white text-2xl sm:text-3xl font-medium tracking-tighter max-w-md sm:max-w-lg">
            Automate.
            <br />
            Simplify. Thrive
          </h2>
          <div className="relative z-1 flex flex-col items-center gap-2">
            <a
              className="bg-white text-black font-semibold text-sm h-11 w-fit px-5 rounded-full inline-flex items-center justify-center shadow-md hover:bg-white/90 transition-colors"
              href="/register"
            >
              {primaryCta}
            </a>
            <span className="text-white/90 text-sm">{supportText}</span>
          </div>
        </motion.div>
      </div>

      {/* Desktop: full-bleed image treatment */}
      <div className="hidden xl:flex flex-col w-full">
        <motion.div
          className="w-full rounded-3xl bg-primary overflow-hidden relative"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: false, margin: "-100px" }}
        >
          <Image
            src="/agent-cta-background.webp"
            alt="Regula regulatory operations platform — start free"
            className="w-full z-0"
            width={1000}
            height={1000}
          />
          <div className="absolute inset-0 -top-32 md:-top-40 flex flex-col items-center justify-center">
            <motion.h2
              className="text-white text-4xl md:text-7xl font-medium tracking-tighter max-w-xs md:max-w-3xl text-center px-4"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: false, margin: "-100px" }}
            >
              Automate.
              <br />
              Simplify. Thrive
            </motion.h2>
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
                {primaryCta}
              </a>
              <span className="text-white text-sm">{supportText}</span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
