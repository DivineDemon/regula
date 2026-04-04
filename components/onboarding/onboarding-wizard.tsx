"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
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
  const [_completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const { profile, saveProfile, clearProfile } =
    useOnboardingState(organizationId);
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

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = (currentStep / TOTAL_STEPS) * 100;

  const handleResetOnboarding = () => {
    clearProfile();
    setCurrentStep(1);
  };

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center gap-5 p-5">
      <div className="w-full flex flex-col items-center justify-center">
        <Logo size={64} />
        <h1 className="text-3xl font-bold mt-5">Welcome to Regula</h1>
        <p className="mt-2 text-muted-foreground">
          Let's get you set up in just a few steps
        </p>
      </div>
      <div className="w-full max-w-1/2 mx-auto flex flex-col items-center justify-center gap-2.5">
        <div className="w-full flex items-center justify-between gap-2">
          <span className="w-full text-left font-medium">
            Step {currentStep} of {TOTAL_STEPS}
          </span>
          <div className="flex items-center justify-end gap-3">
            <span className="text-right text-muted-foreground">
              {Math.round(progress)}% complete
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetOnboarding}
            >
              Reset onboarding
            </Button>
          </div>
        </div>
        <Progress value={progress} />
      </div>
      {currentStep === 1 && (
        <Step1CompanyProfile
          className="max-w-1/2"
          organizationId={organizationId}
          initialData={profile}
          onComplete={(data) => handleStepComplete(1, data)}
          onBack={handleBack}
        />
      )}
      {currentStep === 2 && (
        <Step2Services
          className="max-w-1/2"
          initialData={profile}
          onComplete={(data) => handleStepComplete(2, data)}
          onBack={handleBack}
        />
      )}
      {currentStep === 3 && (
        <Step3GeographicOperations
          className="max-w-1/2"
          initialData={profile}
          onComplete={(data) => handleStepComplete(3, data)}
          onBack={handleBack}
        />
      )}
      {currentStep === 4 && (
        <Step4ComplianceMapping
          className="max-w-1/2"
          initialData={profile}
          onComplete={(data) => handleStepComplete(4, data)}
          onBack={handleBack}
        />
      )}
      {currentStep === 5 && (
        <Step5Partnerships
          className="max-w-1/2"
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
    </div>
  );
}
