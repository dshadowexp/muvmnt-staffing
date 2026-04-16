"use client";

import { toast } from "sonner";
import { upsertLocationAction } from "@/features/geo/dal/mutations";
import { AddressLocation } from "@/features/geo/types";
import { AddressCard } from "@/features/geo/components/address-card";
import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { useOnboardingFormNavigate } from "@/features/onboarding/hooks/use-onboarding-form-navigate";
import { useActionState } from "react";
import { locationAction } from "./_action";
import { useRouter } from "@/i18n/navigation";

interface LocationFormProps {
    location?: AddressLocation | null;
}

export function LocationClient({ location }: LocationFormProps) {
    const router = useRouter();
    const [state, formAction] = useActionState(locationAction, undefined);
    useOnboardingFormNavigate(state);

    async function handleAddressChange(loc: AddressLocation) {
        const { error, message } = await upsertLocationAction(loc);
        if (error) {
            toast.error(message);
            return;
        }
        router.refresh();
    }

    return (
        <form action={formAction} className="space-y-6">
            <AddressCard
                value={location ?? undefined}
                onChange={handleAddressChange}
            />
            <ContinueButton />
        </form>
    );
}