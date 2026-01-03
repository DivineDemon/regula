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
import { getCookieConsent } from "@/lib/utils/cookie-consent";

const COOKIE_CONSENT_VERSION = "v1.0";

interface CookieConsentState {
  essential: boolean;
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
    functional: true,
    analytics: false,
    marketing: false,
    version: COOKIE_CONSENT_VERSION,
    timestamp: Date.now(),
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const checkConsent = async () => {
      // Check localStorage first
      const storedConsent = getCookieConsent();
      if (storedConsent) {
        // Consent exists, don't show banner
        return;
      }

      // If user is logged in, check database
      if (session?.user?.id) {
        try {
          const response = await fetch("/api/consent");
          if (response.ok) {
            const data = await response.json();
            const cookieConsent = data.consents?.find(
              (c: { consentType: string }) => c.consentType === "cookies",
            );

            if (cookieConsent?.granted && !cookieConsent.withdrawn) {
              // Consent exists in database, don't show banner
              return;
            }
          }
        } catch (error) {
          console.error("Failed to check consent:", error);
        }
      }

      // No consent found - show banner
      setShowBanner(true);
    };

    checkConsent();
  }, [session]);

  const saveConsent = async (newConsent: CookieConsentState) => {
    setIsSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem("regula_cookie_consent", JSON.stringify(newConsent));
      setConsent(newConsent);

      // Dispatch event for other components
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
        }
      }

      setShowBanner(false);
      setShowCustomize(false);
    } catch (error) {
      console.error("Error saving consent:", error);
    } finally {
      setIsSaving(false);
    }
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
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="h-4 w-4 rounded border-gray-300"
                  />
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
                  <input
                    type="checkbox"
                    checked={consent.functional}
                    onChange={(e) =>
                      setConsent({ ...consent, functional: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
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
                  <input
                    type="checkbox"
                    checked={consent.analytics}
                    onChange={(e) =>
                      setConsent({ ...consent, analytics: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex-1">
                    <p className="font-medium">Marketing Cookies</p>
                    <p className="text-sm text-muted-foreground">
                      Used to deliver personalized ads and track campaigns.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={consent.marketing}
                    onChange={(e) =>
                      setConsent({ ...consent, marketing: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <Button
                variant="outline"
                onClick={() => setShowCustomize(false)}
                disabled={isSaving}
              >
                Back
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleRejectAll}
                  disabled={isSaving}
                >
                  Reject All
                </Button>
                <Button onClick={handleSaveCustom} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Preferences"}
                </Button>
              </div>
            </CardFooter>
          </>
        ) : (
          <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowCustomize(true)}
              disabled={isSaving}
            >
              Customize
            </Button>
            <Button
              variant="outline"
              onClick={handleRejectAll}
              disabled={isSaving}
            >
              Reject All
            </Button>
            <Button onClick={handleAcceptAll} disabled={isSaving}>
              {isSaving ? "Saving..." : "Accept All"}
            </Button>
          </CardFooter>
        )}
        <div className="px-6 pb-4">
          <p className="text-xs text-muted-foreground">
            Learn more in our{" "}
            <Link
              href="/legal/cookies"
              className="text-primary hover:underline"
              target="_blank"
            >
              Cookie Policy
            </Link>
            . You can change these preferences anytime in{" "}
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
