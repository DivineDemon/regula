"use client";

import { CheckCircle2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Step1Welcome } from "./steps/step1-welcome";
import { Step2AddTargets } from "./steps/step2-add-targets";
import { Step3AlertPreferences } from "./steps/step3-alert-preferences";
import { Step4RunCrawl } from "./steps/step4-run-crawl";
import { Step5WaitForAlert } from "./steps/step5-wait-for-alert";

interface OnboardingWizardProps {
  organizationId: string;
  organizationName: string;
  userId: string;
}

const TOTAL_STEPS = 5;

export function OnboardingWizard({
  organizationId,
  organizationName,
  userId: _userId,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [stepData, setStepData] = useState<{
    organizationName?: string;
    targets?: Array<{
      url: string;
      label: string;
      jurisdiction?: string;
      category?: string;
    }>;
    preferences?: {
      emailEnabled: boolean;
      emailRealtime: boolean;
      alertThreshold: string;
    };
    targetIds?: string[];
  }>({});

  const handleStepComplete = (step: number, data?: unknown) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
    if (data) {
      setStepData((prev) => ({
        ...prev,
        ...(data as Record<string, unknown>),
      }));
    }
    if (step < TOTAL_STEPS) {
      setCurrentStep(step + 1);
    } else {
      // Onboarding complete
      toast.success("Onboarding complete! Welcome to Regula.");
      router.push("/dashboard");
    }
  };

  const handleSkip = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = (currentStep / TOTAL_STEPS) * 100;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-3xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Sparkles className="size-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Welcome to Regula</h1>
          <p className="mt-2 text-muted-foreground">
            Let's get you set up in just a few steps
          </p>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  Step {currentStep} of {TOTAL_STEPS}
                </span>
                <span className="text-muted-foreground">
                  {Math.round(progress)}% complete
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Step Indicators */}
            <div className="mt-6 flex items-center justify-between">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(
                (step) => {
                  const isCompleted = completedSteps.has(step);
                  const isCurrent = currentStep === step;
                  const isPast = currentStep > step;

                  return (
                    <div key={step} className="flex flex-1 items-center">
                      <div className="flex flex-col items-center">
                        <span
                          className={`flex size-10 items-center justify-center rounded-full border-2 transition-colors ${
                            isCompleted
                              ? "border-primary bg-primary text-primary-foreground"
                              : isCurrent
                                ? "border-primary bg-primary/10 text-primary"
                                : isPast
                                  ? "border-muted-foreground/30 bg-muted"
                                  : "border-muted-foreground/30 bg-background"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="size-5" />
                          ) : (
                            <span className="text-sm font-medium">{step}</span>
                          )}
                        </span>
                        <span className="mt-2 text-xs text-muted-foreground">
                          {step === 1 && "Welcome"}
                          {step === 2 && "Targets"}
                          {step === 3 && "Preferences"}
                          {step === 4 && "Crawl"}
                          {step === 5 && "Complete"}
                        </span>
                      </div>
                      {step < TOTAL_STEPS && (
                        <div
                          className={`mx-2 h-0.5 flex-1 transition-colors ${
                            isPast ? "bg-primary" : "bg-muted"
                          }`}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  );
                },
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card>
          <CardContent className="pt-6">
            {currentStep === 1 && (
              <Step1Welcome
                organizationName={organizationName}
                organizationId={organizationId}
                onComplete={(data) => handleStepComplete(1, data)}
                onSkip={handleSkip}
              />
            )}
            {currentStep === 2 && (
              <Step2AddTargets
                organizationId={organizationId}
                onComplete={(data) => handleStepComplete(2, data)}
                onBack={handleBack}
                onSkip={handleSkip}
              />
            )}
            {currentStep === 3 && (
              <Step3AlertPreferences
                organizationId={organizationId}
                onComplete={(data) => handleStepComplete(3, data)}
                onBack={handleBack}
                onSkip={handleSkip}
              />
            )}
            {currentStep === 4 && (
              <Step4RunCrawl
                organizationId={organizationId}
                targetIds={stepData.targetIds || []}
                onComplete={() => handleStepComplete(4)}
                onBack={handleBack}
              />
            )}
            {currentStep === 5 && (
              <Step5WaitForAlert
                organizationId={organizationId}
                onComplete={() => handleStepComplete(5)}
                onBack={handleBack}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
