"use client";

import { UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { REQUESTER_TYPES } from "@/lib/constants";
import {
    ClientProfileValues,
} from "@/features/account/schemas/client";
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

interface ClientProfileFormProps {
  form: UseFormReturn<ClientProfileValues>;
}

export function ClientProfileForm({ form }: ClientProfileFormProps) {
  const { register, setValue, watch, formState } = form;
  const { errors } = formState;
  const t = useTranslations("kyc.onboarding.forms.clientProfile");

  return (
    <>
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="client-name">{t("nameLabel")}</FieldLabel>
          <FieldDescription>{t("nameDescription")}</FieldDescription>
          <Input
            id="client-name"
            type="text"
            placeholder={t("namePlaceholder")}
            {...register("name")}
          />
          <FieldError>{errors.name?.message}</FieldError>
        </Field>

        <Field data-invalid={!!errors.type}>
          <FieldLabel>{t("typeLabel")}</FieldLabel>
          <FieldDescription>{t("typeDescription")}</FieldDescription>
          <input type="hidden" name="type" value={watch("type") ?? ""} />
          <MultiSelect
            single
            values={watch("type") ? [watch("type")] : []}
            onValuesChange={(v) =>
              setValue("type", v[0] ?? "", { shouldValidate: true })
            }
          >
            <MultiSelectTrigger className="w-full">
              <MultiSelectValue placeholder={t("typePlaceholder")} />
            </MultiSelectTrigger>
            <MultiSelectContent search={{ placeholder: t("typeSearch") }}>
              <MultiSelectGroup>
                {REQUESTER_TYPES.map((type) => (
                  <MultiSelectItem key={type} value={type}>
                    {type}
                  </MultiSelectItem>
                ))}
              </MultiSelectGroup>
            </MultiSelectContent>
          </MultiSelect>
          <FieldError>{errors.type?.message}</FieldError>
        </Field>
      </FieldGroup>
    </>
  );
}
