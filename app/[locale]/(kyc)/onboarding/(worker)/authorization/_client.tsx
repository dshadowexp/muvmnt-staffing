"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { useOnboardingFormNavigate } from "@/features/onboarding/hooks/use-onboarding-form-navigate";
import {
  WorkerAuthorizationForm,
  type WorkerAuthorizationFormHandle,
} from "@/features/profile/components/worker-authorization-form";
import { authorizationAction } from "./_action";

interface AuthorizationClientProps {
  initialWorkAuthorization?: {
    type: string;
    file_url?: string | null;
    social_number?: string | null;
    social_number_expiry?: string | null;
  } | null;
  workAuthorizationVerified?: boolean;
}

export function AuthorizationClient({
  initialWorkAuthorization,
  workAuthorizationVerified,
}: AuthorizationClientProps) {
  const authFormRef = useRef<WorkerAuthorizationFormHandle>(null);
  const [preparingContinue, setPreparingContinue] = useState(false);
  const [isContinuePending, startTransition] = useTransition();
  const [state, formAction] = useActionState(authorizationAction, undefined);
  useOnboardingFormNavigate(state);

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void (async () => {
          setPreparingContinue(true);
          try {
            const ok = await authFormRef.current?.prepareForContinue();
            if (ok !== true) return;
            startTransition(() => {
              formAction(new FormData());
            });
          } finally {
            setPreparingContinue(false);
          }
        })();
      }}
    >
      <WorkerAuthorizationForm
        ref={authFormRef}
        initialWorkAuthorization={initialWorkAuthorization}
        workAuthorizationVerified={workAuthorizationVerified}
        enforcePersistedSocialNumberLock={false}
        submitting={preparingContinue || isContinuePending}
      />
      <ContinueButton pending={isContinuePending || preparingContinue} />
    </form>
  );
}