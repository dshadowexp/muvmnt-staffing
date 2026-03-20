"use client";

import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { useEffect } from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { FormErrors } from "@/types";
import { payrollAction } from "./_action";

const initialState: FormErrors = {}

export function PayrollClient() {
    const [serverErrors, formAction] = useActionState(payrollAction, initialState);

    useEffect(() => {
        if (serverErrors?.error) {
            toast.error(serverErrors.error);
        }
    }, [serverErrors]);

    return (
        <form action={formAction}>
            <ContinueButton />
        </form>
    );
}