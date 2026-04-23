"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { useOnboarding } from "@/features/onboarding/onboarding-provider";
import { useTranslatedStepError } from "@/features/onboarding/lib/use-translated-step-error";
import { useTranslations } from "next-intl";
import type { AddressLocation } from "@/features/geo/types";
import { AddressCard } from "@/features/geo/components/address-card";
import { ClientLocationDetailInputs } from "@/features/geo/components/client-location-detail-inputs";
import { ContinueButton } from "@/features/onboarding/components/continue-button";
import type { UserRole } from "@/types/auth";
import { locationAction } from "./_action";

interface LocationFormProps {
  location?: AddressLocation | null;
  role: UserRole;
}

export function LocationClient({ location, role }: LocationFormProps) {
  const router = useRouter();
  const { applyStepsFromServer } = useOnboarding();
  const resolveError = useTranslatedStepError();
  const tErrors = useTranslations("kyc.onboarding.errors");
  const [locationState, setLocationState] = useState<AddressLocation | null>(location ?? null);
  const [isPending, setIsPending] = useState(false);

  const showClientDetails = role === "client" && !!locationState;

  return (
    <form
      className="min-w-0 space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void (async () => {
          if (!locationState) {
            toast.error(tErrors("locationMissing"));
            return;
          }
          setIsPending(true);
          try {
            const result = await locationAction(locationState);
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
      <fieldset disabled={isPending} className="min-w-0 space-y-6 disabled:opacity-60">
        <AddressCard
          value={locationState ?? undefined}
          onChange={setLocationState}
        />

        {showClientDetails && (
          <ClientLocationDetailInputs
            location={locationState}
            onChange={setLocationState}
          />
        )}

        <ContinueButton pending={isPending} />
      </fieldset>
    </form>
  );
}
