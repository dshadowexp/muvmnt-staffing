import { Database } from "@/services/supabase/types/database";
import { z } from "zod";

type ClientValidationKey = "organizationNameRequired" | "organizationTypeRequired";

/** Build a localized client profile schema (see `kyc.onboarding.validation`). */
export function buildClientSchema(t?: (key: ClientValidationKey) => string) {
    const msg = (key: ClientValidationKey) => (t ? t(key) : key);
    return z.object({
        name: z.string().min(1, msg("organizationNameRequired")),
        type: z.string().min(1, msg("organizationTypeRequired")),
    });
}

export const clientSchema = buildClientSchema();

export type ClientProfileValues = z.infer<typeof clientSchema>;

type ClientProfileRow = Database["public"]["Tables"]["clients"]["Row"];

export type ClientProfileFormInput = Pick<
  ClientProfileRow,
  | "id"
  | "name"
  | "type"
>;

export function mapClientProfileToFormValues(row: ClientProfileFormInput): ClientProfileValues {
    return {
        name: row.name,
        type: row.type,
    };
}