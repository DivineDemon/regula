"use client";

import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { navbarItems } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { AnimatedThemeToggler } from "../ui/animated-theme-toggler";
import { buttonVariants } from "../ui/button";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  return (
    <nav className="w-full z-50 fixed top-0 py-5">
      <div className="max-w-7xl w-full px-12 mx-auto">
        <motion.div
          className={cn(
            "p-2.5 rounded-lg flex items-center justify-between",
            isScrolled
              ? "border bg-background/30 backdrop-blur-sm"
              : "border-0 bg-transparent",
          )}
          animate={{
            width: isScrolled ? "980px" : "100%",
            marginLeft: isScrolled ? "auto" : "0",
            marginRight: isScrolled ? "auto" : "0",
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <div className="w-[182px]">
            <Logo size={32} />
          </div>
          <div className="flex items-center justify-center gap-8">
            {navbarItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2">
            <Link
              href="/login"
              className={cn(
                buttonVariants({
                  variant: "ghost",
                  size: "sm",
                }),
              )}
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className={cn(
                buttonVariants({
                  variant: "default",
                  size: "sm",
                }),
              )}
            >
              Get Started
            </Link>
            <AnimatedThemeToggler className="h-8 w-8 p-1.5 rounded-full border border-input bg-background hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors" />
          </div>
        </motion.div>
      </div>
    </nav>
  );
}
