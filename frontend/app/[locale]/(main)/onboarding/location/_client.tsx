"use client";

import { toast } from "sonner";
import { upsertLocationAction } from "@/features/geo/dal/mutations";
import { AddressLocation } from "@/features/geo/types";
import { AddressCard } from "@/features/geo/components/address-card";
import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { useActionState } from "react";
import { FormErrors } from "@/types";
import { locationAction } from "./_action";
import { useRouter } from "@/i18n/navigation";

const initialState: FormErrors = {}

interface LocationFormProps {
    location?: AddressLocation | null;
}

export function LocationClient({ location }: LocationFormProps) {
    const router = useRouter();
    const [serverErrors, formAction] = useActionState(locationAction, initialState);

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