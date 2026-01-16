"use client";

import { Cookie } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

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

/**
 * Prominent cookie consent banner for dashboard
 * Shows when user hasn't given consent yet
 * Cannot be dismissed without making a choice
 */
export function CookieConsentRequiredBanner() {
  const { data: session } = useSession();
  const [showBanner, setShowBanner] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [consent, setConsent] = useState<CookieConsentState>({
    essential: true,
    functional: false,
    analytics: false,
    marketing: false,
    version: COOKIE_CONSENT_VERSION,
    timestamp: Date.now(),
  });

  useEffect(() => {
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
    setShowCustomize(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Cookie className="size-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">
                Cookie Preferences Required
              </CardTitle>
              <CardDescription>
                Please set your cookie preferences to continue using Regula
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        {showCustomize ? (
          <>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex-1">
                    <p className="font-medium">Essential Cookies</p>
                    <p className="text-sm text-muted-foreground">
                      Required for the site to function. Cannot be disabled.
                    </p>
                  </div>
                  <Switch checked={true} disabled />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex-1">
                    <p className="font-medium">Functional Cookies</p>
                    <p className="text-sm text-muted-foreground">
                      Remember your preferences and settings.
                    </p>
                  </div>
                  <Switch
                    checked={consent.functional}
                    onCheckedChange={(e) =>
                      setConsent({ ...consent, functional: e })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex-1">
                    <p className="font-medium">Analytics Cookies</p>
                    <p className="text-sm text-muted-foreground">
                      Help us understand how visitors interact with our site.
                    </p>
                  </div>
                  <Switch
                    checked={consent.analytics}
                    onCheckedChange={(e) =>
                      setConsent({ ...consent, analytics: e })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex-1">
                    <p className="font-medium">Marketing Cookies</p>
                    <p className="text-sm text-muted-foreground">
                      Used to deliver personalized ads and track campaign
                      effectiveness.
                    </p>
                  </div>
                  <Switch
                    checked={consent.marketing}
                    onCheckedChange={(e) =>
                      setConsent({ ...consent, marketing: e })
                    }
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={() => setShowCustomize(false)}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRejectAll}>
                  Reject All
                </Button>
                <Button onClick={handleSaveCustom}>Save Preferences</Button>
              </div>
            </CardFooter>
          </>
        ) : (
          <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setShowCustomize(true)}>
              Customize
            </Button>
            <Button variant="outline" onClick={handleRejectAll}>
              Reject All
            </Button>
            <Button onClick={handleAcceptAll}>Accept All</Button>
          </CardFooter>
        )}
        <div className="px-6 pb-4">
          <p className="text-xs text-muted-foreground">
            Learn more in our&nbsp;
            <Link
              href="/legal/cookies"
              className="text-primary hover:underline"
              target="_blank"
            >
              Cookie Policy
            </Link>
            . You can change these preferences anytime in&nbsp;
            <Link
              href="/settings/consent"
              className="text-primary hover:underline"
            >
              Settings
            </Link>
            .
          </p>
        </div>
      </Card>
    </div>
  );
}
