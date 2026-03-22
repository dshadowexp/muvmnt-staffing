"use client";

import { UseFormReturn } from "react-hook-form";
import { REQUESTER_TYPES } from "@/lib/constants";
import {
    ClientProfileValues,
} from "@/features/profile/schemas/client";
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

  return (
    <>
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="client-name">Organization name</FieldLabel>
          <FieldDescription>
            Your name or business name
          </FieldDescription>
          <Input
            id="client-name"
            type="text"
            placeholder="e.g. Sunnyvale Care Home"
            {...register("name")}
          />
          <FieldError>{errors.name?.message}</FieldError>
        </Field>

        <Field data-invalid={!!errors.type}>
          <FieldLabel>Client type</FieldLabel>
          <FieldDescription>
            Select the type that best describes your organization
          </FieldDescription>
          <input type="hidden" name="type" value={watch("type") ?? ""} />
          <MultiSelect
            single
            values={watch("type") ? [watch("type")] : []}
            onValuesChange={(v) =>
              setValue("type", v[0] ?? "", { shouldValidate: true })
            }
          >
            <MultiSelectTrigger className="w-full">
              <MultiSelectValue placeholder="Select type..." />
            </MultiSelectTrigger>
            <MultiSelectContent search={{ placeholder: "Search type..." }}>
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
