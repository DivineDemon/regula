"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/shared/logo";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useOnboardingState } from "@/hooks/use-onboarding-state";
import type { OrganizationProfile } from "@/lib/types/organization-profile";
import { Step1CompanyProfile } from "./steps/step1-company-profile";
import { Step2Services } from "./steps/step2-services";
import { Step3GeographicOperations } from "./steps/step3-geographic-operations";
import { Step4ComplianceMapping } from "./steps/step4-compliance-mapping";
import { Step5Partnerships } from "./steps/step5-partnerships";
import { Step6Review } from "./steps/step6-review";
import { Step7TargetDiscovery } from "./steps/step7-target-discovery";
import { Step8TargetSelection } from "./steps/step8-target-selection";

interface OnboardingWizardProps {
  organizationId: string;
  organizationName: string;
  userId: string;
}

const TOTAL_STEPS = 8;

export function OnboardingWizard({
  organizationId,
  organizationName: _organizationName,
  userId: _userId,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const { profile, saveProfile } = useOnboardingState(organizationId);
  const [discoveredTargets, setDiscoveredTargets] = useState<
    Array<{
      url: string;
      label: string;
      jurisdiction?: string;
      category?: string;
      confidence?: number;
      reasoning?: string;
      relevantServices?: string[];
      relevantCountries?: string[];
    }>
  >([]);

  const handleStepComplete = (step: number, data?: unknown) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
    if (data) {
      saveProfile(data as Partial<OrganizationProfile>);
    }
    if (step < TOTAL_STEPS) {
      setCurrentStep(step + 1);
    } else {
      // Onboarding complete
      toast.success("Onboarding complete! Welcome to Regula.");
      router.push("/dashboard");
    }
  };

  const _handleSkip = () => {
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
    <div className="flex min-h-screen flex-col items-center bg-muted/30 p-4 py-8">
      <div className="w-full max-w-3xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo size={64} />
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
                          {step === 1 && "Company Profile"}
                          {step === 2 && "Services"}
                          {step === 3 && "Geographic"}
                          {step === 4 && "Compliance"}
                          {step === 5 && "Partnerships"}
                          {step === 6 && "Review"}
                          {step === 7 && "Discovery"}
                          {step === 8 && "Targets"}
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
          <CardContent className="pt-6 max-h-[calc(100vh-24rem)] overflow-y-auto">
            {currentStep === 1 && (
              <Step1CompanyProfile
                organizationId={organizationId}
                initialData={profile}
                onComplete={(data) => handleStepComplete(1, data)}
                onBack={handleBack}
              />
            )}
            {currentStep === 2 && (
              <Step2Services
                initialData={profile}
                onComplete={(data) => handleStepComplete(2, data)}
                onBack={handleBack}
              />
            )}
            {currentStep === 3 && (
              <Step3GeographicOperations
                initialData={profile}
                onComplete={(data) => handleStepComplete(3, data)}
                onBack={handleBack}
              />
            )}
            {currentStep === 4 && (
              <Step4ComplianceMapping
                initialData={profile}
                onComplete={(data) => handleStepComplete(4, data)}
                onBack={handleBack}
              />
            )}
            {currentStep === 5 && (
              <Step5Partnerships
                initialData={profile}
                onComplete={(data) => handleStepComplete(5, data)}
                onBack={handleBack}
              />
            )}
            {currentStep === 6 && (
              <Step6Review
                organizationId={organizationId}
                profile={profile as OrganizationProfile}
                onComplete={(data) => handleStepComplete(6, data)}
                onBack={handleBack}
              />
            )}
            {currentStep === 7 && (
              <Step7TargetDiscovery
                organizationId={organizationId}
                profile={profile as OrganizationProfile}
                onComplete={(targets) => {
                  setDiscoveredTargets(targets);
                  handleStepComplete(7);
                }}
                onBack={handleBack}
              />
            )}
            {currentStep === 8 && (
              <Step8TargetSelection
                organizationId={organizationId}
                discoveredTargets={discoveredTargets}
                onComplete={() => handleStepComplete(8)}
                onBack={handleBack}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
