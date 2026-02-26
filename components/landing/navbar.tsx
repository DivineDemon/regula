"use client";

import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/shared/logo";
import { useIsXl } from "@/hooks/use-mobile";
import { navbarItems } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { AnimatedThemeToggler } from "../ui/animated-theme-toggler";
import { Button, buttonVariants } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";

export function Navbar() {
  const isXl = useIsXl();
  const { scrollY } = useScroll();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  return (
    <nav className="w-full max-w-[100vw] z-50 fixed top-0 px-5 xl:px-0 py-5 overflow-x-clip">
      <motion.div
        className="p-2.5 gap-8 xl:gap-0 mx-auto border backdrop-blur-md max-w-full xl:max-w-6xl rounded-lg flex items-center justify-between bg-background/30 min-w-0"
        {...(isXl
          ? {
              animate: {
                width: isScrolled ? "980px" : "1152px",
                borderWidth: isScrolled ? 1 : 0,
                backdropFilter: isScrolled ? "blur(8px)" : "blur(0px)",
              },
              transition: { duration: 0.3, ease: "easeInOut" },
              style: { borderColor: "#222222" },
            }
          : {
              style: { width: "100%", maxWidth: "100%" },
            })}
      >
        <div className="w-[222px] shrink-0 min-w-0">
          <Logo size={32} />
        </div>
        <div className="hidden lg:flex items-center justify-center gap-8">
          {navbarItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-black dark:text-muted-foreground hover:text-primary dark:hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="hidden lg:flex items-center justify-center gap-2">
          <Link
            href="/login"
            className={cn(
              "hidden lg:flex",
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
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="lg:hidden rounded-md"
            >
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex flex-col space-y-0 gap-0">
            <SheetHeader className="border-b p-4">
              <SheetTitle>Navigation</SheetTitle>
              <SheetDescription>
                Navigate to the sections of the website.
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col items-start justify-start">
              {navbarItems.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="w-full p-4 border-b last:border-b-0 text-sm font-medium transition-all duration-300 hover:bg-muted"
                  onClick={() => setSheetOpen(false)}
                >
                  {label}
                </Link>
              ))}
              <Link
                href="/login"
                className="w-full mt-auto p-4 border-y last:border-b-0 text-sm font-medium transition-all duration-300 hover:bg-muted"
                onClick={() => setSheetOpen(false)}
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="w-full p-4 border-b last:border-b-0 text-sm font-medium transition-all duration-300 hover:bg-muted"
                onClick={() => setSheetOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </motion.div>
    </nav>
  );
}
