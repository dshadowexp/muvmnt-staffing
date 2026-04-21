"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { upsertLocationAction } from "@/features/geo/dal/mutations";
import { AddressLocation } from "@/features/geo/types";
import { AddressCard } from "@/features/geo/components/address-card";
import { ClientLocationDetailInputs } from "@/features/geo/components/client-location-detail-inputs";
import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { useOnboardingFormNavigate } from "@/features/onboarding/hooks/use-onboarding-form-navigate";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { locationAction } from "./_action";
import { useRouter } from "@/i18n/navigation";
import type { UserRole } from "@/types/auth";

interface LocationFormProps {
  location?: AddressLocation | null;
  role: UserRole;
}

export function LocationClient({ location, role }: LocationFormProps) {
  const router = useRouter();
  const [state, formAction, isSubmitting] = useActionState(locationAction, undefined);
  useOnboardingFormNavigate(state);
  const { loading: authLoading } = useAuth();
  const disabled = isSubmitting || authLoading;

  async function persistLocation(next: AddressLocation) {
    const { error, message } = await upsertLocationAction(next);
    if (error) {
      toast.error(message);
      return false;
    }
    return true;
  }

  async function handleAddressChange(loc: AddressLocation) {
    const ok = await persistLocation(loc);
    if (ok) router.refresh();
  }

  const showClientDetails = role === "client" && !!location;

  return (
    <form action={formAction} className="min-w-0 space-y-6">
      <fieldset disabled={disabled} className="min-w-0 space-y-6 disabled:opacity-60">
        <AddressCard value={location ?? undefined} onChange={handleAddressChange} />

        {showClientDetails && (
          <ClientLocationDetailInputs location={location} onPersist={persistLocation} />
        )}

        <ContinueButton pending={isSubmitting} />
      </fieldset>
    </form>
  );
}
