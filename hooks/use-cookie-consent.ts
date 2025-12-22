"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import type { CookieType } from "@/lib/utils/cookie-consent";
import {
  getCookieConsent,
  hasCookieConsent,
  setCookieWithConsent,
} from "@/lib/utils/cookie-consent";

/**
 * React hook for managing cookie consent
 */
export function useCookieConsent() {
  const { data: session } = useSession();
  const [consent, setConsentState] = useState(getCookieConsent());
  const [hasConsent, setHasConsentState] = useState<
    Record<CookieType, boolean>
  >({
    essential: true,
    functional: false,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Update consent state when localStorage changes
    const updateConsent = () => {
      const currentConsent = getCookieConsent();
      setConsentState(currentConsent);
      setHasConsentState({
        essential: true,
        functional: hasCookieConsent("functional"),
        analytics: hasCookieConsent("analytics"),
        marketing: hasCookieConsent("marketing"),
      });
    };

    // Initial load
    updateConsent();

    // Listen for storage changes (when consent is updated in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "regula_cookie_consent") {
        updateConsent();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Also listen for custom event (when consent is updated in same tab)
    const handleConsentChange = () => {
      updateConsent();
    };

    window.addEventListener("cookieConsentChanged", handleConsentChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("cookieConsentChanged", handleConsentChange);
    };
  }, []);

  return {
    consent,
    hasConsent: (type: CookieType) => hasConsent[type],
    setCookie: (
      name: string,
      value: string,
      options: {
        maxAge?: number;
        path?: string;
        domain?: string;
        secure?: boolean;
        sameSite?: "strict" | "lax" | "none";
      } = {},
      cookieType: CookieType = "functional",
    ) => {
      return setCookieWithConsent(name, value, options, cookieType);
    },
    isLoggedIn: !!session?.user?.id,
  };
}
