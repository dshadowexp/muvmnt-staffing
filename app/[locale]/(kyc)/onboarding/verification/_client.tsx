"use client";

import { useActionState, useMemo } from "react";
import { Separator } from "@/components/ui/separator";
import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { useOnboardingFormNavigate } from "@/features/onboarding/hooks/use-onboarding-form-navigate";
import { EmailVerification } from "@/features/verification/components/email-verification";
import { PhoneVerification } from "@/features/verification/components/phone-verification";
import { verifyDetailsAction } from "./_action";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { STAFF_ROLE } from "@/features/auth/types";

export function VerificationClient() {
    const { firebaseUser, authUser } = useAuth();
    const [state, formAction] = useActionState(verifyDetailsAction, undefined);
    useOnboardingFormNavigate(state);

    const continueCheck = authUser?.role === STAFF_ROLE
        ? (firebaseUser?.emailVerified && !!firebaseUser?.phoneNumber)
        : firebaseUser?.emailVerified;

    return (
        <div className="space-y-6">
            <EmailVerification />
            {authUser?.role === STAFF_ROLE && 
                <>
                    <Separator className="my-6" />
                    <PhoneVerification />
                </>
            }
            {continueCheck && (
                <form action={formAction}>
                    <ContinueButton />
                </form>
            )}
        </div>
    );
}