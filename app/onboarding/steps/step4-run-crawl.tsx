"use client";

import { CheckCircle2, Loader2, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface Step4RunCrawlProps {
  organizationId: string;
  targetIds: string[];
  onComplete: () => void;
  onBack: () => void;
}

export function Step4RunCrawl({
  organizationId,
  targetIds,
  onComplete,
  onBack,
}: Step4RunCrawlProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [crawlStatus, setCrawlStatus] = useState<
    "idle" | "starting" | "running" | "completed" | "error"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [completedTargets, setCompletedTargets] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (crawlStatus === "running" && targetIds.length > 0) {
      // Poll for target status updates
      const interval = setInterval(async () => {
        try {
          const response = await fetch(
            `/api/targets?organizationId=${organizationId}`,
          );
          if (response.ok) {
            const data = await response.json();
            const targets = data.targets || [];

            const completed = new Set<string>();
            let allCompleted = true;

            for (const target of targets) {
              if (targetIds.includes(target.id)) {
                if (target.lastCrawlStatus === "completed") {
                  completed.add(target.id);
                } else if (target.lastCrawlStatus !== "completed") {
                  allCompleted = false;
                }
              }
            }

            setCompletedTargets(completed);
            const newProgress = (completed.size / targetIds.length) * 100;
            setProgress(newProgress);

            if (allCompleted && completed.size === targetIds.length) {
              setCrawlStatus("completed");
              clearInterval(interval);
            }
          }
        } catch (error) {
          console.error("Error checking crawl status:", error);
        }
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(interval);
    }
  }, [crawlStatus, targetIds, organizationId]);

  const handleStartCrawl = async () => {
    if (targetIds.length === 0) {
      toast.error("No targets to crawl");
      return;
    }

    setIsStarting(true);
    setCrawlStatus("starting");

    try {
      // Trigger crawls for all targets
      const crawlPromises = targetIds.map(async (targetId) => {
        const response = await fetch("/api/targets/trigger-crawl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetId, organizationId }),
        });

        if (!response.ok) {
          throw new Error(`Failed to trigger crawl for target ${targetId}`);
        }
      });

      await Promise.all(crawlPromises);

      setCrawlStatus("running");
      toast.success("Crawl started successfully");
    } catch (error) {
      console.error("Error starting crawl:", error);
      toast.error("Failed to start crawl. Please try again.");
      setCrawlStatus("error");
    } finally {
      setIsStarting(false);
    }
  };

  const handleContinue = () => {
    if (crawlStatus === "completed") {
      onComplete();
    } else {
      // Allow continuing even if crawl is still running
      onComplete();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Play className="size-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Run Your First Crawl</h2>
        <p className="mt-2 text-muted-foreground">
          Let's fetch the current state of your targets
        </p>
      </div>

      {crawlStatus === "idle" && (
        <div className="space-y-4 rounded-lg border bg-muted/50 p-6 text-center">
          <p className="text-muted-foreground">
            Ready to start monitoring your {targetIds.length} target
            {targetIds.length !== 1 ? "s" : ""}? Click the button below to begin
            the first crawl.
          </p>
          <Button
            onClick={handleStartCrawl}
            disabled={isStarting}
            size="lg"
            className="w-full sm:w-auto"
          >
            {isStarting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="mr-2 size-4" />
                Start Crawl
              </>
            )}
          </Button>
        </div>
      )}

      {(crawlStatus === "starting" || crawlStatus === "running") && (
        <div className="space-y-4 rounded-lg border bg-muted/50 p-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Crawl Progress</span>
              <span className="text-muted-foreground">
                {completedTargets.size} of {targetIds.length} completed
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Targets:</p>
            <div className="space-y-2">
              {targetIds.map((targetId) => {
                const isCompleted = completedTargets.has(targetId);
                return (
                  <div
                    key={targetId}
                    className="flex items-center gap-2 rounded-md border bg-background p-2"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="size-4 text-primary" />
                    ) : (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    )}
                    <span className="text-sm">
                      {isCompleted ? "Completed" : "Crawling..."}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            This may take a few minutes. You can continue once the crawl is
            complete.
          </p>
        </div>
      )}

      {crawlStatus === "completed" && (
        <div className="space-y-4 rounded-lg border bg-primary/5 p-6 text-center">
          <CheckCircle2 className="mx-auto size-12 text-primary" />
          <h3 className="text-lg font-semibold">Crawl Completed!</h3>
          <p className="text-sm text-muted-foreground">
            All targets have been successfully crawled. You can now proceed to
            the next step.
          </p>
        </div>
      )}

      {crawlStatus === "error" && (
        <div className="space-y-4 rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-destructive">
            An error occurred while starting the crawl. You can try again or
            continue to the next step.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 pt-4">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleContinue} disabled={crawlStatus === "starting"}>
          {crawlStatus === "completed" ? "Continue" : "Skip & Continue"}
        </Button>
      </div>
    </div>
  );
}
