"use client";

import { UseFormReturn } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { PROFESSIONAL_ROLES } from "@/lib/constants";
import type { ProfessionalRole } from "@/types";
import {
  WorkerProfileValues,
} from "@/features/profile/schemas/worker";
import { Button } from "@/components/ui/button";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Parse "yyyy-MM-dd" as local date to avoid timezone shifting to previous day. */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

interface WorkerProfileFormProps {
  form: UseFormReturn<WorkerProfileValues>;
}

export function WorkerProfileForm({
  form
}: WorkerProfileFormProps) {
  const { register, setValue, watch, formState } = form;
  const { errors } = formState;

  return (
    <>
      <input type="hidden" {...register("dateOfBirth")} />
      <input type="hidden" {...register("profession")} />
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.firstName}>
            <FieldLabel htmlFor="worker-first-name">First name</FieldLabel>
            <Input
              id="worker-first-name"
              type="text"
              placeholder="Jane"
              {...register("firstName")}
            />
            <FieldError>{errors.firstName?.message}</FieldError>
          </Field>

          <Field data-invalid={!!errors.lastName}>
            <FieldLabel htmlFor="worker-last-name">Last name</FieldLabel>
            <Input
              id="worker-last-name"
              type="text"
              placeholder="Doe"
              {...register("lastName")}
            />
            <FieldError>{errors.lastName?.message}</FieldError>
          </Field>
        </div>

        <Field data-invalid={!!errors.dateOfBirth}>
          <FieldLabel htmlFor="worker-date-of-birth">Date of birth</FieldLabel>
          <FieldDescription>
            Your date of birth for compliance and placement eligibility
          </FieldDescription>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="worker-date-of-birth"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !watch("dateOfBirth") && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 size-4" />
                {watch("dateOfBirth")
                  ? format(parseLocalDate(watch("dateOfBirth")!), "PPP")
                  : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={
                  watch("dateOfBirth")
                    ? parseLocalDate(watch("dateOfBirth")!)
                    : undefined
                }
                defaultMonth={
                  watch("dateOfBirth")
                    ? parseLocalDate(watch("dateOfBirth")!)
                    : undefined
                }
                onSelect={(d) =>
                  setValue(
                    "dateOfBirth",
                    d ? format(d, "yyyy-MM-dd") : "",
                    { shouldValidate: true },
                  )
                }
                disabled={(d) => d > new Date()}
                captionLayout="dropdown"
                fromYear={1900}
                toYear={new Date().getFullYear()}
              />
            </PopoverContent>
          </Popover>
          <FieldError>{errors.dateOfBirth?.message}</FieldError>
        </Field>

        <Field data-invalid={!!errors.profession}>
          <FieldLabel>Profession</FieldLabel>
          <FieldDescription>
            Select your primary healthcare role
          </FieldDescription>
          <MultiSelect
            single
            values={watch("profession") ? [watch("profession")] : []}
            onValuesChange={(v) =>
              setValue("profession", (v[0] ?? "") as ProfessionalRole, {
                shouldValidate: true,
              })
            }
          >
            <MultiSelectTrigger className="w-full">
              <MultiSelectValue placeholder="Select profession..." />
            </MultiSelectTrigger>
            <MultiSelectContent search={{ placeholder: "Search profession..." }}>
              <MultiSelectGroup>
                {(PROFESSIONAL_ROLES as ProfessionalRole[]).map((role) => (
                  <MultiSelectItem key={role} value={role}>
                    {role}
                  </MultiSelectItem>
                ))}
              </MultiSelectGroup>
            </MultiSelectContent>
          </MultiSelect>
          <FieldError>{errors.profession?.message}</FieldError>
        </Field>

        <Field data-invalid={!!errors.yearsExp}>
          <FieldLabel htmlFor="worker-years-exp">Years of experience</FieldLabel>
          <FieldDescription>
            How many years of experience do you have in this role?
          </FieldDescription>
          <Input
            id="worker-years-exp"
            type="number"
            min={0}
            step={1}
            placeholder="0"
            {...register("yearsExp", {
              valueAsNumber: true,
            })}
          />
          <FieldError>{errors.yearsExp?.message}</FieldError>
        </Field>
      </FieldGroup>
    </>
  );
}
