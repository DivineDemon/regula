"use client";

import { Bell, InfoIcon, Mail, Webhook } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NotificationPreferences {
  id?: string;
  emailEnabled: boolean;
  emailRealtime: boolean;
  emailDigest: boolean;
  emailDigestFrequency: "daily" | "weekly";
  alertThreshold: "all" | "low" | "medium" | "high";
  webhookEnabled: boolean;
  webhookUrl: string | null;
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
    webhookEnabled: false,
    webhookUrl: null,
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
          setPreferences(data);
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
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="size-5" />
              Email Notifications
            </CardTitle>
            <CardDescription>
              Configure email notification settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Button
                variant={preferences.emailEnabled ? "default" : "outline"}
                onClick={() =>
                  setPreferences((prev) => ({
                    ...prev,
                    emailEnabled: !prev.emailEnabled,
                  }))
                }
              >
                {preferences.emailEnabled ? "Enabled" : "Disabled"}
              </Button>
            </div>

            {preferences.emailEnabled && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Real-time Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive immediate email notifications when alerts are
                        created
                      </p>
                    </div>
                    <Button
                      variant={
                        preferences.emailRealtime ? "default" : "outline"
                      }
                      onClick={() =>
                        setPreferences((prev) => ({
                          ...prev,
                          emailRealtime: !prev.emailRealtime,
                        }))
                      }
                    >
                      {preferences.emailRealtime ? "Enabled" : "Disabled"}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Digest Emails</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive periodic digest emails with aggregated alerts
                      </p>
                    </div>
                    <Button
                      variant={preferences.emailDigest ? "default" : "outline"}
                      onClick={() =>
                        setPreferences((prev) => ({
                          ...prev,
                          emailDigest: !prev.emailDigest,
                        }))
                      }
                    >
                      {preferences.emailDigest ? "Enabled" : "Disabled"}
                    </Button>
                  </div>

                  {preferences.emailDigest && (
                    <div className="space-y-2">
                      <Label>Digest Frequency</Label>
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
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Alert Threshold */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5" />
              Alert Threshold
            </CardTitle>
            <CardDescription>
              Only receive notifications for alerts above this impact level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Minimum Impact Level</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon className="size-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Only receive notifications for alerts with an impact score
                      at or above this threshold. This helps reduce notification
                      noise.
                    </p>
                  </TooltipContent>
                </Tooltip>
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
              <p className="text-sm text-muted-foreground">
                {preferences.alertThreshold === "all" &&
                  "You will receive notifications for all alerts regardless of impact score."}
                {preferences.alertThreshold === "low" &&
                  "You will receive notifications for alerts with impact score ≥ 0%."}
                {preferences.alertThreshold === "medium" &&
                  "You will receive notifications for alerts with impact score ≥ 40%."}
                {preferences.alertThreshold === "high" &&
                  "You will receive notifications only for alerts with impact score ≥ 70%."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="size-5" />
              Webhook Integration
            </CardTitle>
            <CardDescription>
              Send alert notifications to an external webhook URL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Webhooks</Label>
                <p className="text-sm text-muted-foreground">
                  Send alert notifications to your webhook endpoint
                </p>
              </div>
              <Button
                variant={preferences.webhookEnabled ? "default" : "outline"}
                onClick={() =>
                  setPreferences((prev) => ({
                    ...prev,
                    webhookEnabled: !prev.webhookEnabled,
                  }))
                }
              >
                {preferences.webhookEnabled ? "Enabled" : "Disabled"}
              </Button>
            </div>

            {preferences.webhookEnabled && (
              <div className="space-y-2">
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
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </div>
    </div>
  );
}
