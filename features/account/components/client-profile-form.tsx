"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import type { RequesterType } from "@/types";
import {
  INDIVIDUAL_CLIENT_TYPE,
  ORGANIZATION_REQUESTER_TYPES,
} from "@/lib/constants";
import { ClientProfileValues } from "@/features/account/schemas/client";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClientProfileFormProps {
  form: UseFormReturn<ClientProfileValues>;
}

export function ClientProfileForm({ form }: ClientProfileFormProps) {
  const { register, setValue, watch, getValues, formState } = form;
  const { errors } = formState;
  const type = watch("type");
  const t = useTranslations("kyc.onboarding.forms.clientProfile");

  const [segment, setSegment] = React.useState<
    "individual" | "organization" | null
  >(() => {
    const initial = getValues("type");
    if (!initial) return null;
    if (initial === INDIVIDUAL_CLIENT_TYPE) return "individual";
    return "organization";
  });

  React.useEffect(() => {
    if (type === INDIVIDUAL_CLIENT_TYPE) setSegment("individual");
    else if (type) setSegment("organization");
  }, [type]);

  function onSegmentChange(value: "individual" | "organization") {
    if (value === segment) return;
    setSegment(value);
    setValue("name", "", { shouldValidate: false, shouldDirty: false });
    if (value === "individual") {
      setValue("type", INDIVIDUAL_CLIENT_TYPE, { shouldValidate: true });
      return;
    }
    const cur = getValues("type");
    if (cur === INDIVIDUAL_CLIENT_TYPE) {
      setValue("type", "", { shouldValidate: true });
    }
  }

  const nameField = segment ? (
    <Field data-invalid={!!errors.name}>
      <FieldLabel htmlFor="client-name">
        {segment === "individual"
          ? t("nameLabelIndividual")
          : t("nameLabelOrganization")}
      </FieldLabel>
      <FieldDescription>
        {segment === "individual"
          ? t("nameDescriptionIndividual")
          : t("nameDescriptionOrganization")}
      </FieldDescription>
      <Input
        id="client-name"
        type="text"
        placeholder={
          segment === "individual"
            ? t("namePlaceholderIndividual")
            : t("namePlaceholderOrganization")
        }
        {...register("name")}
      />
      <FieldError>{errors.name?.message}</FieldError>
    </Field>
  ) : null;

  const typeField =
    segment === "organization" ? (
      <Field data-invalid={!!errors.type}>
        <FieldLabel>{t("typeLabel")}</FieldLabel>
        <FieldDescription>{t("typeDescription")}</FieldDescription>
        <input type="hidden" name="type" value={watch("type") ?? ""} />
        <MultiSelect
          single
          values={watch("type") ? [watch("type")] : []}
          onValuesChange={(v) =>
            setValue("type", (v[0] ?? "") as RequesterType, {
              shouldValidate: true,
            })
          }
        >
          <MultiSelectTrigger className="w-full">
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
    ) : null;

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="client-account-kind">
          {t("accountKindLabel")}
        </FieldLabel>
        <FieldDescription>{t("accountKindDescription")}</FieldDescription>
        <Select
          value={segment ?? ""}
          onValueChange={(v) =>
            onSegmentChange(v as "individual" | "organization")
          }
        >
          <SelectTrigger
            id="client-account-kind"
            className="w-full max-w-none"
            size="default"
          >
            <SelectValue placeholder={t("accountKindPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="individual">
              {t("accountKindIndividual")}
            </SelectItem>
            <SelectItem value="organization">
              {t("accountKindOrganization")}
            </SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {/* Order matches the user's mental model:
          - Individual → just ask for their name.
          - Organization → pick the type first, then fill in the org name. */}
      {segment === "individual" ? nameField : null}
      {segment === "organization" ? (
        <>
          {typeField}
          {nameField}
        </>
      ) : null}
    </FieldGroup>
  );
}
