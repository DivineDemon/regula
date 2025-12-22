"use client";

import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Step5WaitForAlertProps {
  organizationId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function Step5WaitForAlert({
  organizationId,
  onComplete: _onComplete,
  onBack,
}: Step5WaitForAlertProps) {
  const router = useRouter();
  const [hasAlert, setHasAlert] = useState(false);
  const [checking, setChecking] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);

  const checkForAlerts = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/alerts?organizationId=${organizationId}&limit=1`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.alerts && data.alerts.length > 0) {
          setHasAlert(true);
          setChecking(false);
        } else {
          setChecking(false);
        }
      }
    } catch (error) {
      console.error("Error checking for alerts:", error);
      setChecking(false);
    }
  }, [organizationId]);

  useEffect(() => {
    // Check for alerts immediately
    checkForAlerts();

    // Poll for alerts every 5 seconds
    const interval = setInterval(() => {
      checkForAlerts();
      setElapsedTime((prev) => prev + 5);
    }, 5000);

    // Update elapsed time every second
    const timeInterval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, [checkForAlerts]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleFinish = () => {
    toast.success("Onboarding complete! Welcome to Regula.");
    router.push("/dashboard");
  };

  const handleSkip = () => {
    toast.success("Onboarding complete! You can check for alerts later.");
    router.push("/dashboard");
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Sparkles className="size-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Almost There!</h2>
        <p className="mt-2 text-muted-foreground">
          We're monitoring your targets for changes. This may take a few
          minutes.
        </p>
      </div>

      {checking && !hasAlert && (
        <div className="space-y-4 rounded-lg border bg-muted/50 p-6 text-center">
          <Loader2 className="mx-auto size-12 animate-spin text-primary" />
          <h3 className="text-lg font-semibold">Waiting for First Alert</h3>
          <p className="text-sm text-muted-foreground">
            We're checking your targets for changes. This usually takes a few
            minutes.
          </p>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">
              Elapsed time: {formatTime(elapsedTime)}
            </p>
          </div>
        </div>
      )}

      {!checking && !hasAlert && (
        <div className="space-y-4 rounded-lg border bg-muted/50 p-6 text-center">
          <p className="text-muted-foreground">
            No alerts yet. Don't worry - alerts will appear here as soon as we
            detect changes. You can continue to your dashboard and check back
            later.
          </p>
        </div>
      )}

      {hasAlert && (
        <div className="space-y-4 rounded-lg border bg-primary/5 p-6 text-center">
          <CheckCircle2 className="mx-auto size-12 text-primary" />
          <h3 className="text-lg font-semibold">First Alert Detected!</h3>
          <p className="text-sm text-muted-foreground">
            Great! Your monitoring is working. You can now view and manage
            alerts from your dashboard.
          </p>
          <Button onClick={handleFinish} className="mt-4">
            Go to Dashboard
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 pt-4">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={handleSkip}>
            Skip
          </Button>
          {hasAlert && <Button onClick={handleFinish}>Finish</Button>}
        </div>
      </div>
    </div>
  );
}
