"use client";

import { useActionState } from "react";
import { Separator } from "@/components/ui/separator";
import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { useOnboardingFormNavigate } from "@/features/onboarding/hooks/use-onboarding-form-navigate";
import { EmailVerification } from "@/features/verification/components/email-verification";
import { PhoneVerification } from "@/features/verification/components/phone-verification";
import { verifyDetailsAction } from "./_action";
import { useAuth } from "@/features/auth/providers/auth-provider";

export function VerificationClient() {
    return (
        <div className="space-y-6">
            <EmailVerification />
            <Separator className="my-6" />
            <PhoneVerification />
            <VerificationForm />
        </div>
    );
}

function VerificationForm() {
    const { firebaseUser } = useAuth();
    const [state, formAction] = useActionState(verifyDetailsAction, undefined);
    useOnboardingFormNavigate(state);

    if (!firebaseUser?.emailVerified || !firebaseUser?.phoneNumber) return null;

    return (
        <form action={formAction}>
            <ContinueButton />
        </form>
    );
}