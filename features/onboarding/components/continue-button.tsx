"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useOnboarding } from "../onboarding-provider";
import { LoadingSwap } from "@/components/ui/loading-swap";

interface ContinueButtonProps {
  id?: string;
  text?: string;
  pending?: boolean;
  skipSlot?: ReactNode;
  skipPending?: boolean;
}

export function ContinueButton({
  text,
  pending: pendingProp,
  skipSlot,
  skipPending,
}: ContinueButtonProps) {
  const { back, isFirstStep, steps, currentStepIndex } = useOnboarding();
  const { pending: formActionPending } = useFormStatus();
  const pending = Boolean(skipPending || (pendingProp ?? formActionPending));
  const { loading: authLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations("kyc.onboarding");

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
          disabled={disabled}
        >
          <ChevronLeft className="size-4" />
          {t("back")}
        </Button>
      )}
      <div className="flex items-center gap-2">
        {skipSlot}
        <Button type="submit" variant="default" disabled={disabled}>
          <LoadingSwap isLoading={pending || authLoading}>
            {text ?? t("continue")}
          </LoadingSwap>
        </Button>
      </div>
    </div>
  );
}
