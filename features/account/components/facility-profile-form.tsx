"use client";

import { useId } from "react";
import { UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { ORGANIZATION_REQUESTER_TYPES } from "@/lib/constants";
import {
  type ClientProfileFormValues,
  type ClientProfileValues,
} from "@/features/account/schemas/client";
import type { AddressLocation } from "@/features/geo/types";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/components/ui/multi-select";
import { AddressCard } from "@/features/geo/components/address-card";

interface FacilityProfileFormProps {
  form: UseFormReturn<ClientProfileFormValues, unknown, ClientProfileValues>;
  disabled?: boolean;
}

export function FacilityProfileForm({ form, disabled = false }: FacilityProfileFormProps) {
  const { register, setValue, watch, formState } = form;
  const { errors } = formState;
  const t = useTranslations("kyc.onboarding.forms.clientProfile");
  const tAddress = useTranslations("kyc.onboarding.forms.address");
  const baseId = useId();

  const address = watch("address") ?? null;

  function handleAddressChange(loc: AddressLocation) {
    setValue("address", loc, { shouldValidate: true });
  }

  function handleSuiteBlur(value: string) {
    if (!address) return;
    setValue("address", { ...address, addressLine2: value.trim() || null });
  }

  function handlePostalBlur(value: string) {
    if (!address) return;
    setValue("address", { ...address, postalCode: value.trim() || null });
  }

  return (
    <FieldGroup>
      <Field data-invalid={!!errors.type}>
        <FieldLabel>{t("typeLabel")}</FieldLabel>
        <FieldDescription>{t("typeDescription")}</FieldDescription>
        <input type="hidden" {...register("type")} />
        <MultiSelect
          single
          values={watch("type") ? [watch("type")] : []}
          onValuesChange={(v) => setValue("type", v[0] ?? "", { shouldValidate: true })}
        >
          <MultiSelectTrigger className="w-full" disabled={disabled}>
            <MultiSelectValue placeholder={t("typePlaceholder")} />
          </MultiSelectTrigger>
          <MultiSelectContent search={{ placeholder: t("typeSearch") }}>
            <MultiSelectGroup>
              {ORGANIZATION_REQUESTER_TYPES.map((orgType) => (
                <MultiSelectItem key={orgType} value={orgType}>
                  {orgType}
                </MultiSelectItem>
              ))}
            </MultiSelectGroup>
          </MultiSelectContent>
        </MultiSelect>
        <FieldError>{errors.type?.message}</FieldError>
      </Field>

      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor={`${baseId}-name`}>{t("nameLabelOrganization")}</FieldLabel>
        <FieldDescription>{t("nameDescriptionOrganization")}</FieldDescription>
        <Input
          id={`${baseId}-name`}
          type="text"
          placeholder={t("namePlaceholderOrganization")}
          disabled={disabled}
          {...register("name")}
        />
        <FieldError>{errors.name?.message}</FieldError>
      </Field>

      <Field data-invalid={!!errors.domainsText}>
        <FieldLabel htmlFor={`${baseId}-domains`}>{t("domainsLabel")}</FieldLabel>
        <FieldDescription>{t("domainsDescription")}</FieldDescription>
        <Textarea
          id={`${baseId}-domains`}
          rows={4}
          placeholder={t("domainsPlaceholder")}
          disabled={disabled}
          autoComplete="off"
          {...register("domainsText")}
        />
        <FieldError>{errors.domainsText?.message}</FieldError>
      </Field>

      <Field>
        <FieldLabel>{tAddress("addressLabel")}</FieldLabel>
        <FieldDescription>{tAddress("addressDescription")}</FieldDescription>
        <AddressCard
          value={address ?? undefined}
          onChange={handleAddressChange}
        />
      </Field>

      {address && (
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <Field className="min-w-0">
            <FieldLabel htmlFor={`${baseId}-suite`}>{tAddress("suiteLabel")}</FieldLabel>
            <Input
              id={`${baseId}-suite`}
              key={address.address}
              defaultValue={address.addressLine2 ?? ""}
              onBlur={(e) => handleSuiteBlur(e.target.value)}
              placeholder={tAddress("suitePlaceholder")}
              autoComplete="address-line2"
              disabled={disabled}
            />
          </Field>
          <Field className="min-w-0">
            <FieldLabel htmlFor={`${baseId}-postal`}>{tAddress("postalCodeLabel")}</FieldLabel>
            <Input
              id={`${baseId}-postal`}
              key={address.address}
              defaultValue={address.postalCode ?? ""}
              onBlur={(e) => handlePostalBlur(e.target.value)}
              placeholder={tAddress("postalCodePlaceholder")}
              autoComplete="postal-code"
              disabled={disabled}
            />
          </Field>
        </div>
      )}
    </FieldGroup>
  );
}
