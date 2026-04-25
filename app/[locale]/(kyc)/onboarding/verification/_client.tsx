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
    const { firebaseUser, authUser } = useAuth();
    const [state, formAction] = useActionState(verifyDetailsAction, undefined);
    useOnboardingFormNavigate(state);

    return (
        <div className="space-y-6">
            <EmailVerification />
            <Separator className="my-6" />
            {authUser?.role === "worker" && <PhoneVerification />}
            {(!firebaseUser?.emailVerified || !firebaseUser?.phoneNumber) && (
                <form action={formAction}>
                    <ContinueButton />
                </form>
            )}
        </div>
    );
}