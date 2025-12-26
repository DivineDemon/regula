"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { OrganizationProfile } from "@/lib/types/organization-profile";

interface DiscoveredTarget {
  url: string;
  label: string;
  jurisdiction?: string;
  category?: string;
  confidence?: number;
  reasoning?: string;
  relevantServices?: string[];
  relevantCountries?: string[];
}

interface Step7TargetDiscoveryProps {
  organizationId: string;
  profile: OrganizationProfile;
  onComplete: (targets: DiscoveredTarget[]) => void;
  onBack: () => void;
}

export function Step7TargetDiscovery({
  organizationId,
  profile: _profile,
  onComplete,
  onBack,
}: Step7TargetDiscoveryProps) {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const discoverTargets = async () => {
      setIsDiscovering(true);
      setError(null);
      setProgress(0);

      try {
        // Simulate progress
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 500);

        const response = await fetch("/api/targets/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId: organizationId,
          }),
        });

        clearInterval(progressInterval);
        setProgress(100);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage =
            errorData.error ||
            `Failed to discover targets (${response.status})`;
          throw new Error(errorMessage);
        }

        const data = await response.json();
        onComplete(data.targets || []);
      } catch (err) {
        console.error("Error discovering targets:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to discover targets. Please try again.";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsDiscovering(false);
      }
    };

    discoverTargets();
  }, [organizationId, onComplete]);

  const handleRetry = () => {
    setError(null);
    setProgress(0);
    // Trigger re-discovery by re-running useEffect
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            {isDiscovering ? (
              <Loader2 className="size-8 animate-spin text-primary" />
            ) : (
              <Sparkles className="size-8 text-primary" />
            )}
          </div>
        </div>
        <h2 className="text-2xl font-bold">Discovering Regulatory Targets</h2>
        <p className="mt-2 text-muted-foreground">
          {isDiscovering
            ? "Our AI is analyzing your profile to find relevant regulatory targets..."
            : error
              ? "Discovery failed. Please try again."
              : "Discovery complete!"}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {isDiscovering && (
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Analyzing your services and geographic operations</p>
              <p>• Identifying relevant regulatory authorities</p>
              <p>• Matching compliance requirements</p>
              <p>• Generating target recommendations</p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={handleRetry} className="mt-4">
              Retry Discovery
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={isDiscovering}
        >
          Back
        </Button>
        {!isDiscovering && !error && (
          <Button onClick={() => onComplete([])}>
            Continue to Target Selection
          </Button>
        )}
      </div>
    </div>
  );
}
