"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { CookieConsentBanner } from "@/components/shared/cookie-consent-banner";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster />
      <CookieConsentBanner />
    </SessionProvider>
  );
}
