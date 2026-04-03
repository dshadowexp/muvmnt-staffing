"use client";

import { useEffect, useActionState } from "react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { EmailVerification } from "@/features/verification/components/email-verification";
import { PhoneVerification } from "@/features/verification/components/phone-verification";
import { FormErrors } from "@/types";
import { verifyDetailsAction } from "./_action";

const initialState: FormErrors = {}

export function VerificationClient() {
    const [serverErrors, formAction] = useActionState(verifyDetailsAction, initialState);

    useEffect(() => {
        if (serverErrors?.error) {
            toast.error(serverErrors.error);
        }
    }, [serverErrors]);

    return (
        <form action={formAction} className="space-y-6">
            <EmailVerification />
            <Separator className="my-6" />
            <PhoneVerification />
            <ContinueButton />
        </form>
    );
}