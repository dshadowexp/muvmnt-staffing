"use client";

import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { useEffect, useState } from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { FormErrors } from "@/types";
import { payrollAction } from "./_action";
import { retrievePayrollAccountAction, setupPayrollAction } from "@/features/billing/actions";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSwap } from "@/components/ui/loading-swap";

const initialState: FormErrors = {}

export function PayrollClient() {
    const [serverErrors, formAction] = useActionState(payrollAction, initialState);
    const [loading, setLoading] = useState(false);
    const [payrollComplete, setPayrollComplete] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        async function retrieveAccountLink() {
        setFetching(true);
        try {
            const { data, error } = await retrievePayrollAccountAction();
            if (error) throw new Error(error);
            setPayrollComplete(data?.enabled ?? false);
        } catch {
            setPayrollComplete(false);
        } finally {
            setFetching(false);
        }
        }
        retrieveAccountLink();
    }, []);


    useEffect(() => {
        if (serverErrors?.error) {
            toast.error(serverErrors.error);
        }
    }, [serverErrors]);

    async function handleSetup() {
        setLoading(true);
        try {
            await setupPayrollAction();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    if (fetching) {
        return (
            <Loader2 className="size-4 animate-spin" />
        )
    }

    return (
        <form action={formAction} className="space-y-6">
            {payrollComplete ? (
                <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                    <Check className="size-4" />
                    Complete
                </div>
            ) : (
                <Button onClick={handleSetup} disabled={loading} className="w-fit">
                    <LoadingSwap isLoading={loading} >
                        Begin
                    </LoadingSwap>
                </Button>
            )}
            <ContinueButton text={"Finish"} />
        </form>
    );
}