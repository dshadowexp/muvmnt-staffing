"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { WorkerAuthorizationForm } from "@/features/profile/components/worker-authorization-form";
import { FormErrors } from "@/types";
import { authorizationAction } from "./_action";
import { useActionState } from "react";

const initialState: FormErrors = {}

interface AuthorizationClientProps {
    initialWorkAuthorization?:
      | { type: string; file_url: string }
      | null;
    initialWorkerPhotoUrl?: string | null;
  }

export function AuthorizationClient({
  initialWorkAuthorization,
  initialWorkerPhotoUrl,
}: AuthorizationClientProps) {
    const [serverErrors, formAction] = useActionState(authorizationAction, initialState);

    useEffect(() => {
        if (serverErrors?.error) {
            toast.error(serverErrors.error);
        }
    }, [serverErrors]);

    return (
        <form action={formAction} className="space-y-6">
            <WorkerAuthorizationForm
              initialWorkAuthorization={initialWorkAuthorization}
              initialWorkerPhotoUrl={initialWorkerPhotoUrl}
            />
            <ContinueButton />
        </form>
    );
}