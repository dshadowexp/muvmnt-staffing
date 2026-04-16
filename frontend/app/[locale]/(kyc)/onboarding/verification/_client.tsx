"use client";

import { useActionState } from "react";
import { Separator } from "@/components/ui/separator";
import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { useOnboardingFormNavigate } from "@/features/onboarding/hooks/use-onboarding-form-navigate";
import { EmailVerification } from "@/features/verification/components/email-verification";
import { PhoneVerification } from "@/features/verification/components/phone-verification";
import { verifyDetailsAction } from "./_action";

export function VerificationClient() {
  const [state, formAction] = useActionState(verifyDetailsAction, undefined);
  useOnboardingFormNavigate(state);

  return (
        <form action={formAction} className="space-y-6">
            <EmailVerification />
            <Separator className="my-6" />
            <PhoneVerification />
            <ContinueButton />
        </form>
    );
}