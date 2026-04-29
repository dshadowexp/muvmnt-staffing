import { z } from "zod";
import type { AddressLocation } from "@/features/geo/types";
import { normalizeDomainsFromInput, normalizeSingleDomain } from "@/features/account/lib/normalize-domains";

export type ClientValidationKey =
    | "organizationNameRequired"
    | "organizationTypeRequired"
    | "domainsRequired"
    | "domainsInvalid";

/** Build a localized client profile schema (see `kyc.onboarding.validation`). */
export function buildClientSchema(t?: (key: ClientValidationKey, values?: Record<string, string>) => string) {
    const msg = (key: ClientValidationKey, values?: Record<string, string>) =>
        t ? t(key, values) : key;

    return z
        .object({
            name: z.string().min(1, msg("organizationNameRequired")),
            type: z.string().min(1, msg("organizationTypeRequired")),
            address: z.custom<AddressLocation>().nullable().optional(),
            /** One domain per line, or comma / semicolon separated — validated on submit. */
            domainsText: z.string(),
        })
        .superRefine((data, ctx) => {
            const list = normalizeDomainsFromInput(data.domainsText);
            if (list.length === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: msg("domainsRequired"),
                    path: ["domainsText"],
                });
                return;
            }
            const rawParts = data.domainsText.split(/[\n,;]+/);
            for (const part of rawParts) {
                const trimmed = part.trim();
                if (!trimmed) continue;
                const n = normalizeSingleDomain(trimmed);
                if (!n) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: msg("domainsInvalid", { domain: trimmed }),
                        path: ["domainsText"],
                    });
                    return;
                }
            }
        })
        .transform((data) => ({
            name: data.name,
            type: data.type,
            address: data.address ?? null,
            domains: normalizeDomainsFromInput(data.domainsText),
        }));
}

export const clientSchema = buildClientSchema();

/** Form state (textarea + fields before Zod transform). */
export type ClientProfileFormValues = z.input<typeof clientSchema>;

/** Parsed payload for server actions (includes normalized `domains`). */
export type ClientProfileValues = z.output<typeof clientSchema>;

export type ClientProfileFormInput = {
    id: string;
    name: string;
    type: string;
    address: AddressLocation | null;
    domains: string[] | null;
};

export function mapClientProfileToFormValues(row: ClientProfileFormInput): ClientProfileFormValues {
    return {
        name: row.name,
        type: row.type,
        address: row.address ?? null,
        domainsText: row.domains?.length ? row.domains.join("\n") : "",
    };
}
