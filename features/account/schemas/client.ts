import { z } from "zod";
import type { AddressLocation } from "@/features/geo/types";

type ClientValidationKey = "organizationNameRequired" | "organizationTypeRequired";

/** Build a localized client profile schema (see `kyc.onboarding.validation`). */
export function buildClientSchema(t?: (key: ClientValidationKey) => string) {
    const msg = (key: ClientValidationKey) => (t ? t(key) : key);
    return z.object({
        name:    z.string().min(1, msg("organizationNameRequired")),
        type:    z.string().min(1, msg("organizationTypeRequired")),
        address: z.custom<AddressLocation>().nullable().optional(),
    });
}

export const clientSchema = buildClientSchema();

export type ClientProfileValues = z.infer<typeof clientSchema>;

export type ClientProfileFormInput = {
    id:      string;
    name:    string;
    type:    string;
    address: AddressLocation | null;
};

export function mapClientProfileToFormValues(row: ClientProfileFormInput): ClientProfileValues {
    return {
        name:    row.name,
        type:    row.type,
        address: row.address ?? null,
    };
}
