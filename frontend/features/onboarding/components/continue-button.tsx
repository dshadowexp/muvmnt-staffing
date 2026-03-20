"use client";

import { useFormStatus } from "react-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { useOnboarding } from "../onboarding-provider";
import { LoadingSwap } from "@/components/ui/loading-swap";

export function ContinueButton({ text = "Continue" }: { id?: string, text?: string }) {
  const { back, isFirstStep, isLastStep, steps, currentStepIndex } = useOnboarding();
  const { pending } = useFormStatus();
  const router = useRouter();

  function handleBack() {
    if (isFirstStep) return;
    const prevStep = steps[currentStepIndex - 1];
    if (prevStep) {
      back();
      router.push(prevStep.route);
    }
  }

  return (
    <div className="flex w-full items-center justify-between pt-6">
      {isFirstStep ? (
        <span />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="gap-1.5"
        >
          <ChevronLeft className="size-4" />
          Back
        </Button>
      )}
      <Button type="submit" variant="default" disabled={pending}>
          <LoadingSwap isLoading={pending}>
            { text }
          </LoadingSwap>
      </Button>
    </div>
  );
}