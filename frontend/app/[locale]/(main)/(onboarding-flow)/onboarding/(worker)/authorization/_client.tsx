"use client";

import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { useOnboardingFormNavigate } from "@/features/onboarding/hooks/use-onboarding-form-navigate";
import { WorkerAuthorizationForm } from "@/features/profile/components/worker-authorization-form";
import { authorizationAction } from "./_action";
import { useActionState } from "react";

interface AuthorizationClientProps {
  initialWorkAuthorization?: { type: string; file_url: string } | null;
  workAuthorizationVerified?: boolean;
}

export function AuthorizationClient({
  initialWorkAuthorization,
  workAuthorizationVerified,
}: AuthorizationClientProps) {
    const [state, formAction] = useActionState(authorizationAction, undefined);
    useOnboardingFormNavigate(state);

    return (
        <form action={formAction} className="space-y-6">
            <WorkerAuthorizationForm
              initialWorkAuthorization={initialWorkAuthorization}
              workAuthorizationVerified={workAuthorizationVerified}
            />
            <ContinueButton />
        </form>
    );
}