"use client";

import { Bell, Mail, Webhook } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Switch } from "../ui/switch";

const ALERT_CATEGORIES = [
  { value: "aml", label: "AML" },
  { value: "kyc", label: "KYC" },
  { value: "licensing", label: "Licensing" },
  { value: "fees", label: "Fees" },
  { value: "regulations", label: "Regulations" },
  { value: "other", label: "Other" },
] as const;

interface NotificationPreferences {
  id?: string;
  emailEnabled: boolean;
  emailRealtime: boolean;
  emailDigest: boolean;
  emailDigestFrequency: "daily" | "weekly";
  alertThreshold: "all" | "low" | "medium" | "high";
  categoryFilters: string[] | null;
  webhookEnabled: boolean;
  webhookUrl: string | null;
  webhookSecret: string | null;
}

export function NotificationPreferencesClient({
  organizationId,
}: {
  organizationId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailEnabled: true,
    emailRealtime: true,
    emailDigest: true,
    emailDigestFrequency: "daily",
    alertThreshold: "all",
    categoryFilters: null,
    webhookEnabled: false,
    webhookUrl: null,
    webhookSecret: null,
  });

  useEffect(() => {
    const fetchPreferences = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/notification-preferences?organizationId=${organizationId}`,
        );
        if (response.ok) {
          const data = await response.json();
          setPreferences({
            ...data,
            categoryFilters: data.categoryFilters ?? null,
          });
        }
      } catch (error) {
        console.error("Error fetching preferences:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [organizationId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/notification-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          ...preferences,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save preferences");
      }

      const data = await response.json();
      setPreferences(data);
      toast.success("Preferences saved successfully!");
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full grid grid-cols-2 items-start justify-start gap-5">
        {/* Email Notifications Skeleton */}
        <div className="w-full col-span-1 rounded-3xl border flex flex-col items-start justify-start">
          <div className="w-full flex items-center justify-start p-5 border-b gap-3.5">
            <Skeleton className="size-12 rounded-full" />
            <div className="flex-1 flex flex-col items-start justify-start gap-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          <div className="w-full flex items-center justify-center p-5 border-b gap-4">
            <div className="flex-1 flex flex-col items-start justify-start gap-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
          <div className="w-full flex items-center justify-center p-5 border-b gap-4">
            <div className="flex-1 flex flex-col items-start justify-start gap-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
          <div className="w-full flex items-center justify-center p-5 border-b gap-4">
            <div className="flex-1 flex flex-col items-start justify-start gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
          <div className="w-full flex items-center justify-center p-5 gap-4">
            <div className="flex-1 flex flex-col items-start justify-start gap-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        {/* Right Column Skeleton */}
        <div className="w-full col-span-1 flex flex-col items-start justify-start gap-5">
          {/* Alert Threshold Skeleton */}
          <div className="w-full flex flex-col items-start justify-start border rounded-3xl">
            <div className="w-full flex items-center justify-start p-5 border-b gap-3.5">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex-1 flex flex-col items-start justify-start gap-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <div className="w-full flex items-center justify-center p-5 gap-4">
              <div className="flex-1 flex flex-col items-start justify-start gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-80" />
              </div>
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
          {/* Webhook Integration Skeleton */}
          <div className="w-full flex flex-col items-start justify-start border rounded-3xl">
            <div className="w-full flex items-center justify-start p-5 border-b gap-3.5">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex-1 flex flex-col items-start justify-start gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <div className="w-full flex items-center justify-center p-5 border-b gap-4">
              <div className="flex-1 flex flex-col items-start justify-start gap-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full grid grid-cols-2 items-start justify-start gap-5">
      <div className="w-full col-span-1 rounded-3xl border flex flex-col items-start justify-start">
        <div className="w-full flex items-center justify-start p-5 border-b gap-3.5">
          <div className="size-12 p-3 rounded-full bg-primary/20 text-primary">
            <Mail className="size-full" />
          </div>
          <div className="flex-1 flex flex-col items-start justify-start">
            <span className="text-lg font-bold">Email Notifications</span>
            <span className="text-sm text-muted-foreground">
              Configure email notification settings
            </span>
          </div>
        </div>
        <div className="w-full flex items-center justify-center p-5 border-b">
          <div className="flex-1 flex flex-col items-start justify-start">
            <span className="w-full text-left">Enable Email Notifications</span>
            <span className="w-full text-left text-sm text-muted-foreground">
              Receive notifications via email
            </span>
          </div>
          <Switch
            checked={preferences.emailEnabled}
            onCheckedChange={(checked) =>
              setPreferences((prev) => ({
                ...prev,
                emailEnabled: checked,
              }))
            }
          />
        </div>
        {preferences.emailEnabled && (
          <>
            <div className="w-full flex items-center justify-center p-5 border-b">
              <div className="flex-1 flex flex-col items-start justify-start">
                <span className="w-full text-left">Real-time Alerts</span>
                <span className="w-full text-left text-sm text-muted-foreground">
                  Receive immediate email notifications when alerts are created
                </span>
              </div>
              <Switch
                checked={preferences.emailRealtime}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({
                    ...prev,
                    emailRealtime: checked,
                  }))
                }
              />
            </div>
            <div className="w-full flex items-center justify-center p-5 border-b">
              <div className="flex-1 flex flex-col items-start justify-start">
                <span className="w-full text-left">Digest Emails</span>
                <span className="w-full text-left text-sm text-muted-foreground">
                  Receive periodic digest emails with aggregated alerts
                </span>
              </div>
              <Switch
                checked={preferences.emailDigest}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({
                    ...prev,
                    emailDigest: checked,
                  }))
                }
              />
            </div>
            {preferences.emailDigest && (
              <div className="w-full flex items-center justify-center p-5">
                <div className="flex-1 flex flex-col items-start justify-start">
                  <span className="w-full text-left">Digest Frequency</span>
                  <span className="w-full text-left text-sm text-muted-foreground">
                    Choose how often you want to receive digest emails
                  </span>
                </div>
                <Select
                  value={preferences.emailDigestFrequency}
                  onValueChange={(value) => {
                    if (value === "daily" || value === "weekly") {
                      setPreferences((prev) => ({
                        ...prev,
                        emailDigestFrequency: value,
                      }));
                    }
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}
      </div>
      <div className="w-full col-span-1 flex flex-col items-start justify-start gap-5">
        <div className="w-full flex flex-col items-start justify-start border rounded-3xl">
          <div className="w-full flex items-center justify-start p-5 border-b gap-3.5">
            <div className="size-12 p-3 rounded-full bg-primary/20 text-primary">
              <Bell className="size-full" />
            </div>
            <div className="flex-1 flex flex-col items-start justify-start">
              <span className="text-lg font-bold">Alert Threshold</span>
              <span className="text-sm text-muted-foreground">
                Only receive notifications for alerts above this impact level
              </span>
            </div>
          </div>
          <div className="w-full flex items-center justify-center p-5">
            <div className="flex-1 flex flex-col items-start justify-start">
              <span className="w-full text-left">Minimum Impact Level</span>
              <span className="w-full text-left text-sm text-muted-foreground">
                {preferences.alertThreshold === "all" &&
                  "You will receive notifications for all alerts regardless of impact score."}
                {preferences.alertThreshold === "low" &&
                  "You will receive notifications for alerts with impact score ≥ 0%."}
                {preferences.alertThreshold === "medium" &&
                  "You will receive notifications for alerts with impact score ≥ 40%."}
                {preferences.alertThreshold === "high" &&
                  "You will receive notifications only for alerts with impact score ≥ 70%."}
              </span>
            </div>
            <Select
              value={preferences.alertThreshold}
              onValueChange={(value) => {
                if (
                  value === "all" ||
                  value === "low" ||
                  value === "medium" ||
                  value === "high"
                ) {
                  setPreferences((prev) => ({
                    ...prev,
                    alertThreshold: value,
                  }));
                }
              }}
              aria-label="Alert threshold"
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Alerts</SelectItem>
                <SelectItem value="low">Low and Above</SelectItem>
                <SelectItem value="medium">Medium and Above</SelectItem>
                <SelectItem value="high">High Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="w-full flex flex-col items-start justify-start border rounded-3xl">
          <div className="w-full flex items-center justify-start p-5 border-b gap-3.5">
            <div className="size-12 p-3 rounded-full bg-primary/20 text-primary">
              <Bell className="size-full" />
            </div>
            <div className="flex-1 flex flex-col items-start justify-start">
              <span className="text-lg font-bold">Category Filter</span>
              <span className="text-sm text-muted-foreground">
                Only receive notifications for these alert categories (leave all
                unchecked for all categories)
              </span>
            </div>
          </div>
          <div className="w-full flex flex-wrap items-center justify-start gap-4 p-5">
            {ALERT_CATEGORIES.map((cat) => {
              const selected = (preferences.categoryFilters ?? []).includes(
                cat.value,
              );
              return (
                <div key={cat.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${cat.value}`}
                    checked={selected}
                    onCheckedChange={(checked) => {
                      const current = preferences.categoryFilters ?? [];
                      const next = checked
                        ? [...current, cat.value]
                        : current.filter((c) => c !== cat.value);
                      setPreferences((prev) => ({
                        ...prev,
                        categoryFilters: next.length > 0 ? next : null,
                      }));
                    }}
                  />
                  <Label
                    htmlFor={`category-${cat.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {cat.label}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
        <div className="w-full flex flex-col items-start justify-start border rounded-3xl">
          <div className="w-full flex items-center justify-start p-5 border-b gap-3.5">
            <div className="size-12 p-3 rounded-full bg-primary/20 text-primary">
              <Webhook className="size-full" />
            </div>
            <div className="flex-1 flex flex-col items-start justify-start">
              <span className="text-lg font-bold">Webhook Integration</span>
              <span className="text-sm text-muted-foreground">
                Send alert notifications to an external webhook URL
              </span>
            </div>
          </div>
          <div
            className={cn(
              "w-full flex items-center justify-center p-5",
              preferences.webhookEnabled ? "border-b" : "",
            )}
          >
            <div className="flex-1 flex flex-col items-start justify-start">
              <span className="w-full text-left">
                Enable Webhook Integration
              </span>
              <span className="w-full text-left text-sm text-muted-foreground">
                Send alert notifications to an external webhook URL
              </span>
            </div>
            <Switch
              checked={preferences.webhookEnabled}
              onCheckedChange={(checked) =>
                setPreferences((prev) => ({
                  ...prev,
                  webhookEnabled: checked,
                }))
              }
            />
          </div>
          {preferences.webhookEnabled && (
            <>
              <div className="w-full flex flex-col items-start justify-start gap-2.5 px-5 pt-5 pb-2.5">
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  type="url"
                  placeholder="https://example.com/webhook"
                  value={preferences.webhookUrl || ""}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      webhookUrl: e.target.value,
                    }))
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Your webhook will receive POST requests with alert data when
                  alerts are created.
                </p>
              </div>
              <div className="w-full flex flex-col items-start justify-start gap-2.5 px-5 pt-2.5 pb-5">
                <Label htmlFor="webhookSecret">Webhook Secret (Optional)</Label>
                <Input
                  id="webhookSecret"
                  type="password"
                  placeholder="Enter secret for HMAC signature"
                  value={preferences.webhookSecret || ""}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      webhookSecret: e.target.value || null,
                    }))
                  }
                />
                <p className="text-sm text-muted-foreground">
                  If provided, webhook requests will include an&nbsp;
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    X-Regula-Signature
                  </code>
                  &nbsp; header with HMAC-SHA256 signature for verification.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
      {/* Save Button */}
      <div className="w-full col-span-2 flex justify-end mt-auto">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}
