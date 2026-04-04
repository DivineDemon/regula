"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export function Footer() {
  return (
    <motion.footer
      className="mt-auto w-full flex flex-col max-w-7xl mx-auto border-x"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: false, margin: "-100px" }}
    >
      <div className="w-full px-6">
        <div className="w-full h-full border-x grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-0 items-center justify-center py-10 px-5">
          <motion.div
            className="w-fit h-full flex flex-col items-start justify-start"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: false, margin: "-100px" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Logo size={24} />
              <span className="font-bold text-lg font-heading">Regula</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Crawler-backed monitoring, triage workflows, and exports—built for
              teams that need a clear system of record, not legal advice in a
              box.
            </p>
          </motion.div>
          <motion.div
            className="flex items-start justify-start md:justify-end gap-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: false, margin: "-100px" }}
          >
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    href="#features"
                    className="hover:text-primary transition-colors"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="#comparison"
                    className="hover:text-primary transition-colors"
                  >
                    Comparison
                  </Link>
                </li>
                <li>
                  <Link
                    href="#pricing"
                    className="hover:text-primary transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="#contact"
                    className="hover:text-primary transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    href="/legal/privacy"
                    className="hover:text-primary transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/legal/terms"
                    className="hover:text-primary transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    href="/legal/security"
                    className="hover:text-primary transition-colors"
                  >
                    Security Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/legal/cookies"
                    className="hover:text-primary transition-colors"
                  >
                    Cookies
                  </Link>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
      <motion.p
        className="w-full text-center text-xs p-5 border-t"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        viewport={{ once: true, margin: "0px" }}
      >
        &copy; {new Date().getFullYear()} Regula. All rights reserved.
      </motion.p>
    </motion.footer>
  );
}
