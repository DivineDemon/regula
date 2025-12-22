"use client";

import { Cookie, Shield } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const COOKIE_CONSENT_KEY = "regula_cookie_consent";
const COOKIE_CONSENT_VERSION = "v1.0";

interface CookieConsentState {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  version: string;
  timestamp: number;
}

interface Step2CookieConsentProps {
  onComplete: () => void;
  onBack: () => void;
}

export function Step2CookieConsent({
  onComplete,
  onBack,
}: Step2CookieConsentProps) {
  const { data: session } = useSession();
  const [consent, setConsent] = useState<CookieConsentState>({
    essential: true,
    functional: true, // Default to true for better UX
    analytics: false,
    marketing: false,
    version: COOKIE_CONSENT_VERSION,
    timestamp: Date.now(),
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));

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
                functional: consent.functional,
                analytics: consent.analytics,
                marketing: consent.marketing,
              },
            }),
          });
        } catch (error) {
          console.error("Failed to save consent to database:", error);
          // Continue anyway - localStorage is saved
        }
      }

      toast.success("Cookie preferences saved");
      onComplete();
    } catch (error) {
      console.error("Error saving consent:", error);
      toast.error("Failed to save preferences. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Cookie className="size-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Cookie Preferences</h2>
        <p className="mt-2 text-muted-foreground">
          We use cookies to enhance your experience. Please choose your
          preferences below.
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="size-5 text-primary" />
                <CardTitle className="text-lg">Essential Cookies</CardTitle>
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                Required
              </span>
            </div>
            <CardDescription>
              These cookies are necessary for the site to function properly.
              They cannot be disabled.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Includes session management, security, and authentication cookies.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Functional Cookies</CardTitle>
            <CardDescription>
              Remember your preferences and settings for a better experience.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Examples: Sidebar state, theme preferences, organization
                selection
              </p>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={consent.functional}
                  onChange={(e) =>
                    setConsent({ ...consent, functional: e.target.checked })
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20" />
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Analytics Cookies</CardTitle>
            <CardDescription>
              Help us understand how visitors use our site to improve our
              service.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Examples: Page views, user interactions, performance metrics
              </p>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={consent.analytics}
                  onChange={(e) =>
                    setConsent({ ...consent, analytics: e.target.checked })
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20" />
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Marketing Cookies</CardTitle>
            <CardDescription>
              Used to deliver personalized ads and track campaign effectiveness.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Examples: Ad targeting, conversion tracking, remarketing
              </p>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={consent.marketing}
                  onChange={(e) =>
                    setConsent({ ...consent, marketing: e.target.checked })
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20" />
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-4">
        <p className="text-xs text-muted-foreground">
          Learn more about how we use cookies in our{" "}
          <Link
            href="/legal/cookies"
            className="text-primary hover:underline"
            target="_blank"
          >
            Cookie Policy
          </Link>
          . You can change these preferences anytime in your{" "}
          <Link
            href="/settings/consent"
            className="text-primary hover:underline"
            target="_blank"
          >
            Settings
          </Link>
          .
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={isSaving}
        >
          Back
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
