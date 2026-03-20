"use client";

import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { detailsAction } from "./_action";
import { ClientProfileForm } from "@/features/profile/components/client-profile-form";
import { ClientProfileFormInput, ClientProfileValues, clientSchema, mapClientProfileToFormValues } from "@/features/profile/schemas/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

export function OrganizationClient({ clientProfile }: { clientProfile: ClientProfileFormInput | null }) {
    const form = useForm<ClientProfileValues>({
        defaultValues: clientProfile
          ? mapClientProfileToFormValues(clientProfile)
          : { name: "", type: "" },
        resolver: zodResolver(clientSchema),
    });

    return (
        <form action={detailsAction} className="space-y-6">
            <ClientProfileForm form={form} />
            <ContinueButton />
        </form>
    );
}