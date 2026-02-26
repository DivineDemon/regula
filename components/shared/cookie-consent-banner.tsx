"use client";

import { Cookie } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "../ui/switch";

const COOKIE_CONSENT_KEY = "regula_cookie_consent";
const COOKIE_CONSENT_VERSION = "v1.0";

interface CookieConsentState {
  essential: boolean; // Always true, required for site to function
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  version: string;
  timestamp: number;
}

export function CookieConsentBanner() {
  const { data: session } = useSession();
  const [showBanner, setShowBanner] = useState(false);
  const [consent, setConsent] = useState<CookieConsentState>({
    essential: true,
    functional: false,
    analytics: false,
    marketing: false,
    version: COOKIE_CONSENT_VERSION,
    timestamp: Date.now(),
  });

  useEffect(() => {
    // Don't show banner on onboarding page (has dedicated step)
    if (
      typeof window !== "undefined" &&
      window.location.pathname === "/onboarding"
    ) {
      return;
    }

    const loadConsent = async () => {
      // If user is logged in, try to load consent from database first
      if (session?.user?.id) {
        try {
          const response = await fetch("/api/consent");
          if (response.ok) {
            const data = await response.json();
            const cookieConsent = data.consents?.find(
              (c: { consentType: string }) => c.consentType === "cookies",
            );

            if (cookieConsent?.granted && !cookieConsent.withdrawn) {
              // Load metadata from database consent
              const metadata = cookieConsent.metadata
                ? JSON.parse(cookieConsent.metadata)
                : {};

              const dbConsent: CookieConsentState = {
                essential: true,
                functional: metadata.functional ?? false,
                analytics: metadata.analytics ?? false,
                marketing: metadata.marketing ?? false,
                version: cookieConsent.consentVersion || COOKIE_CONSENT_VERSION,
                timestamp: new Date(cookieConsent.granted).getTime(),
              };

              // Sync to localStorage
              localStorage.setItem(
                COOKIE_CONSENT_KEY,
                JSON.stringify(dbConsent),
              );
              setConsent(dbConsent);
              return; // Don't show banner if consent exists in DB
            }
          }
        } catch (error) {
          console.error("Failed to load consent from database:", error);
          // Continue to check localStorage
        }
      }

      // Check localStorage for consent
      const storedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!storedConsent) {
        setShowBanner(true);
        return;
      }

      try {
        const parsed = JSON.parse(storedConsent) as CookieConsentState;
        // If consent version changed, show banner again
        if (parsed.version !== COOKIE_CONSENT_VERSION) {
          setShowBanner(true);
          return;
        }
        // Consent exists and is current
        setConsent(parsed);
      } catch {
        // Invalid stored consent, show banner
        setShowBanner(true);
      }
    };

    loadConsent();
  }, [session]);

  const saveConsent = async (newConsent: CookieConsentState) => {
    // Save to localStorage
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(newConsent));
    setConsent(newConsent);

    // Dispatch event for other components to listen
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cookieConsentChanged"));
    }

    // If user is logged in, also save to database
    if (session?.user?.id) {
      try {
        await fetch("/api/consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consentType: "cookies",
            consentVersion: COOKIE_CONSENT_VERSION,
            metadata: {
              functional: newConsent.functional,
              analytics: newConsent.analytics,
              marketing: newConsent.marketing,
            },
          }),
        });
      } catch (error) {
        console.error("Failed to save consent to database:", error);
        // Continue anyway - localStorage is saved
      }
    }

    setShowBanner(false);
  };

  const handleAcceptAll = () => {
    saveConsent({
      essential: true,
      functional: true,
      analytics: true,
      marketing: true,
      version: COOKIE_CONSENT_VERSION,
      timestamp: Date.now(),
    });
  };

  const handleRejectAll = () => {
    saveConsent({
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
      version: COOKIE_CONSENT_VERSION,
      timestamp: Date.now(),
    });
  };

  const handleSaveCustom = () => {
    saveConsent(consent);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="w-80 md:w-124 p-5 rounded-xl border shadow bg-background flex flex-col items-center justify-center gap-5">
        <div className="w-full flex flex-col items-center justify-center gap-2.5">
          <div className="w-full flex items-center justify-center gap-3.5">
            <Cookie className="size-4" />
            <span className="font-medium flex-1 text-left">
              Cookie Preferences
            </span>
          </div>
          <p className="w-full text-sm text-muted-foreground">
            We use cookies to enhance your experience, analyze site usage, and
            assist in marketing efforts. You can customize your preferences
            below. Learn more in our&nbsp;
            <Link
              href="/legal/cookies"
              className="text-primary hover:underline inline-block"
            >
              Cookie Policy
            </Link>
            .
          </p>
        </div>
        <div className="w-full flex items-center justify-center gap-5">
          <div className="flex-1 flex flex-col items-center justify-center">
            <span className="w-full text-sm text-left font-medium">
              Essential Cookies
            </span>
            <p className="w-full text-left text-xs text-muted-foreground">
              Required for the site to function. Cannot be disabled.
            </p>
          </div>
          <Switch checked={true} disabled />
        </div>
        <div className="w-full flex items-center justify-center gap-5">
          <div className="flex-1 flex flex-col items-center justify-center">
            <span className="w-full text-sm text-left font-medium">
              Functional Cookies
            </span>
            <p className="w-full text-left text-xs text-muted-foreground">
              Remember your preferences and settings.
            </p>
          </div>
          <Switch
            checked={consent.functional}
            onCheckedChange={(e) => setConsent({ ...consent, functional: e })}
          />
        </div>
        <div className="w-full flex items-center justify-center gap-5">
          <div className="flex-1 flex flex-col items-center justify-center">
            <span className="w-full text-sm text-left font-medium">
              Analytics Cookies
            </span>
            <p className="w-full text-left text-xs text-muted-foreground">
              Help us understand how visitors interact with our site.
            </p>
          </div>
          <Switch
            checked={consent.analytics}
            onCheckedChange={(e) => setConsent({ ...consent, analytics: e })}
          />
        </div>
        <div className="w-full flex items-center justify-center gap-5">
          <div className="flex-1 flex flex-col items-center justify-center">
            <span className="w-full text-sm text-left font-medium">
              Marketing Cookies
            </span>
            <p className="w-full text-left text-xs text-muted-foreground">
              Used to deliver personalized ads and track campaign effectiveness.
            </p>
          </div>
          <Switch
            checked={consent.marketing}
            onCheckedChange={(e) => setConsent({ ...consent, marketing: e })}
          />
        </div>
        <div className="w-full grid grid-cols-2 md:grid-cols-3 items-center justify-center gap-2.5">
          <Button type="button" variant="default" onClick={handleAcceptAll}>
            Accept All
          </Button>
          <Button type="button" variant="outline" onClick={handleRejectAll}>
            Reject All
          </Button>
          <Button
            type="button"
            variant="outline"
            className="col-span-2 md:col-span-1"
            onClick={handleSaveCustom}
          >
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
}
