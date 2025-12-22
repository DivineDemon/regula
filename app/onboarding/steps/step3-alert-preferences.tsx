"use client";

import { Bell, Mail } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface Step3AlertPreferencesProps {
  organizationId: string;
  onComplete: (data: {
    emailEnabled: boolean;
    emailRealtime: boolean;
    alertThreshold: string;
  }) => void;
  onBack: () => void;
  onSkip: () => void;
}

export function Step3AlertPreferences({
  organizationId,
  onComplete,
  onBack,
  onSkip,
}: Step3AlertPreferencesProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preferences, setPreferences] = useState({
    emailEnabled: true,
    emailRealtime: true,
    alertThreshold: "all",
  });

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/notification-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          emailEnabled: preferences.emailEnabled,
          emailRealtime: preferences.emailRealtime,
          emailDigest: true,
          emailDigestFrequency: "daily",
          alertThreshold: preferences.alertThreshold,
          webhookEnabled: false,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save preferences");
      }

      onComplete(preferences);
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Bell className="size-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Configure Alert Preferences</h2>
        <p className="mt-2 text-muted-foreground">
          Set up how you want to receive notifications about regulatory changes
        </p>
      </div>

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
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Real-time Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive immediate email notifications when alerts are
                    created
                  </p>
                </div>
                <Button
                  variant={preferences.emailRealtime ? "default" : "outline"}
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
            </>
          )}
        </CardContent>
      </Card>

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
            <Label>Minimum Impact Level</Label>
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

      <div className="flex items-center justify-between gap-4 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={isSubmitting}
        >
          Back
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            disabled={isSubmitting}
          >
            Skip
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
