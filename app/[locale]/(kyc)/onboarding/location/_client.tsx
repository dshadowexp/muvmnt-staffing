"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { upsertLocationAction } from "@/features/geo/dal/mutations";
import { AddressLocation } from "@/features/geo/types";
import { AddressCard } from "@/features/geo/components/address-card";
import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { useOnboardingFormNavigate } from "@/features/onboarding/hooks/use-onboarding-form-navigate";
import { useActionState } from "react";
import { locationAction } from "./_action";
import { useRouter } from "@/i18n/navigation";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { UserRole } from "@/types/auth";

interface LocationFormProps {
    location?: AddressLocation | null;
    role: UserRole;
}

export function LocationClient({ location, role }: LocationFormProps) {
    const router = useRouter();
    const [state, formAction] = useActionState(locationAction, undefined);
    useOnboardingFormNavigate(state);
    const t = useTranslations("kyc.onboarding.forms.address");
    const [, startTransition] = useTransition();

    const [suite, setSuite] = useState(location?.addressLine2 ?? "");
    const [postalCode, setPostalCode] = useState(location?.postalCode ?? "");
    const [instructions, setInstructions] = useState(location?.instructions ?? "");

    useEffect(() => {
        setSuite(location?.addressLine2 ?? "");
        setPostalCode(location?.postalCode ?? "");
        setInstructions(location?.instructions ?? "");
    }, [location?.id, location?.addressLine2, location?.postalCode, location?.instructions]);

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

    async function handleDetailsBlur(field: "addressLine2" | "postalCode" | "instructions", value: string) {
        if (!location) return;
        const trimmed = value.trim();
        const current =
            field === "addressLine2"
                ? location.addressLine2 ?? ""
                : field === "postalCode"
                  ? location.postalCode ?? ""
                  : location.instructions ?? "";
        if (trimmed === current.trim()) return;

        const next: AddressLocation = {
            ...location,
            addressLine2: field === "addressLine2" ? (trimmed || null) : location.addressLine2,
            postalCode: field === "postalCode" ? (trimmed || null) : location.postalCode,
            instructions: field === "instructions" ? (trimmed || null) : location.instructions,
        };

        const ok = await persistLocation(next);
        if (ok) startTransition(() => router.refresh());
    }

    const showClientDetails = role === "client" && !!location;

    return (
        <form action={formAction} className="space-y-6">
            <AddressCard
                value={location ?? undefined}
                onChange={handleAddressChange}
            />

            {showClientDetails && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                        <FieldLabel htmlFor="suite">{t("suiteLabel")}</FieldLabel>
                        <Input
                            id="suite"
                            value={suite}
                            onChange={(e) => setSuite(e.target.value)}
                            onBlur={(e) => handleDetailsBlur("addressLine2", e.target.value)}
                            placeholder={t("suitePlaceholder")}
                            autoComplete="address-line2"
                        />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="postal-code">{t("postalCodeLabel")}</FieldLabel>
                        <Input
                            id="postal-code"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            onBlur={(e) => handleDetailsBlur("postalCode", e.target.value)}
                            placeholder={t("postalCodePlaceholder")}
                            autoComplete="postal-code"
                        />
                    </Field>
                    <Field className="sm:col-span-2">
                        <FieldLabel htmlFor="instructions">{t("instructionsLabel")}</FieldLabel>
                        <Textarea
                            id="instructions"
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            onBlur={(e) => handleDetailsBlur("instructions", e.target.value)}
                            placeholder={t("instructionsPlaceholder")}
                            rows={4}
                        />
                    </Field>
                </div>
            )}

            <ContinueButton />
        </form>
    );
}
