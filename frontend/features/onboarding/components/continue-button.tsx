"use client";

import { useFormStatus } from "react-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useOnboarding } from "../onboarding-provider";
import { LoadingSwap } from "@/components/ui/loading-swap";

interface ContinueButtonProps {
  id?: string;
  text?: string;
  /** When using `onSubmit` + server action instead of `action={}`, pass `useTransition` pending. */
  pending?: boolean;
}

export function ContinueButton({ text = "Continue", pending: pendingProp }: ContinueButtonProps) {
  const { back, isFirstStep, isLastStep, steps, currentStepIndex } = useOnboarding();
  const { pending: formActionPending } = useFormStatus();
  const pending = pendingProp ?? formActionPending;
  const { loading: authLoading } = useAuth();
  const router = useRouter();

  const disabled = pending || authLoading;

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
      <Button type="submit" variant="default" disabled={disabled}>
          <LoadingSwap isLoading={pending || authLoading}>
            { text }
          </LoadingSwap>
      </Button>
    </div>
  );
}