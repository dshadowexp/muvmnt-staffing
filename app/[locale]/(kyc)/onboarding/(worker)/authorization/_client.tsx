"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { useOnboarding } from "@/features/onboarding/onboarding-provider";
import { useTranslatedStepError } from "@/features/onboarding/lib/use-translated-step-error";
import { ContinueButton } from "@/features/onboarding/components/continue-button";
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
  const router = useRouter();
  const { applyStepsFromServer } = useOnboarding();
  const resolveError = useTranslatedStepError();
  const authFormRef = useRef<WorkerAuthorizationFormHandle>(null);
  const [isPending, setIsPending] = useState(false);

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void (async () => {
          setIsPending(true);
          try {
            let values = await authFormRef.current?.prepareForContinue();

            // When already verified, the form shows a static summary and
            // prepareForContinue returns null — use the initial data as-is.
            if (!values && workAuthorizationVerified && initialWorkAuthorization?.type) {
              values = {
                type: initialWorkAuthorization.type,
                socialNumber: initialWorkAuthorization.social_number ?? "",
                socialNumberExpiry: initialWorkAuthorization.social_number_expiry,
              };
            }

            if (!values) return;

            const result = await authorizationAction(values);
            if (!result.ok) {
              toast.error(resolveError(result));
              return;
            }

            applyStepsFromServer(result.steps);
            router.push(result.redirectTo);
          } finally {
            setIsPending(false);
          }
        })();
      }}
    >
      <WorkerAuthorizationForm
        ref={authFormRef}
        initialWorkAuthorization={initialWorkAuthorization}
        workAuthorizationVerified={workAuthorizationVerified}
        enforcePersistedSocialNumberLock={false}
        submitting={isPending}
      />
      <ContinueButton pending={isPending} />
    </form>
  );
}
