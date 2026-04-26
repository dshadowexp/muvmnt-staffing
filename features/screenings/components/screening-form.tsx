"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { LoadingSwap } from "@/components/ui/loading-swap";
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/components/ui/multi-select";
import { LOCALE_LABELS } from "@/lib/constants";

const LANGUAGES: { value: "en" | "fr"; label: string }[] = [
  { value: "en", label: LOCALE_LABELS.en ?? "English" },
  { value: "fr", label: LOCALE_LABELS.fr ?? "Français" },
];

export const screeningSchema = z.object({
  title: z.string().min(1, "Title is required"),
  deadline_days: z
    .number()
    .int()
    .min(1, "At least 1 day")
    .max(90, "At most 90 days"),
  interview_duration: z
    .number()
    .int()
    .min(5, "At least 5 minutes")
    .max(120, "At most 120 minutes"),
  allowed_languages: z
    .array(z.enum(["en", "fr"]))
    .min(1, "Select at least one language"),
  require_identity: z.boolean(),
  description: z.string().min(1, "Description is required"),
});

export type ScreeningFormValues = z.infer<typeof screeningSchema>;

const DEFAULT_VALUES: ScreeningFormValues = {
  title: "",
  deadline_days: 7,
  interview_duration: 10,
  allowed_languages: ["en"],
  require_identity: false,
  description: "",
};

type Props = {
  defaultValues?: Partial<ScreeningFormValues>;
  onSubmit: (data: ScreeningFormValues) => Promise<void>;
  submitLabel: React.ReactNode;
  requireDirty?: boolean;
};

export function ScreeningForm({
  defaultValues,
  onSubmit,
  submitLabel,
  requireDirty = false,
}: Props) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ScreeningFormValues>({
    defaultValues: { ...DEFAULT_VALUES, ...defaultValues },
    resolver: zodResolver(screeningSchema) as Resolver<ScreeningFormValues>,
  });

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-6">
          {/* Title */}
          <Field data-invalid={!!errors.title}>
            <FieldLabel htmlFor="title">Role title</FieldLabel>
            <Input
              id="title"
              placeholder="e.g. Registered Nurse – Long-Term Care"
              disabled={isSubmitting}
              aria-invalid={!!errors.title || undefined}
              {...register("title")}
            />
            <FieldError>{errors.title?.message}</FieldError>
          </Field>

          {/* Deadline / Duration */}
          <div className="grid grid-cols-2 gap-4">
            <Field data-invalid={!!errors.deadline_days}>
              <FieldLabel htmlFor="deadline_days">Deadline (days)</FieldLabel>
              <Input
                id="deadline_days"
                type="number"
                min={1}
                max={90}
                disabled={isSubmitting}
                aria-invalid={!!errors.deadline_days || undefined}
                {...register("deadline_days", { valueAsNumber: true })}
              />
              <FieldDescription>
                How many days the candidate has to complete the interview after receiving the invite.
              </FieldDescription>
              <FieldError>{errors.deadline_days?.message}</FieldError>
            </Field>

            <Field data-invalid={!!errors.interview_duration}>
              <FieldLabel htmlFor="interview_duration">Duration (min)</FieldLabel>
              <Input
                id="interview_duration"
                type="number"
                min={5}
                max={120}
                step={5}
                disabled={isSubmitting}
                aria-invalid={!!errors.interview_duration || undefined}
                {...register("interview_duration", { valueAsNumber: true })}
              />
              <FieldDescription>
                Maximum length of the AI-led interview session in minutes.
              </FieldDescription>
              <FieldError>{errors.interview_duration?.message}</FieldError>
            </Field>
          </div>

          {/* Interview languages */}
          <Field data-invalid={!!errors.allowed_languages}>
            <FieldLabel>Interview language(s)</FieldLabel>
            <FieldDescription>
              The languages candidates can choose to conduct their interview in.
            </FieldDescription>
            <Controller
              control={control}
              name="allowed_languages"
              render={({ field }) => (
                <MultiSelect
                  values={field.value}
                  onValuesChange={(vals) =>
                    field.onChange(vals as ("en" | "fr")[])
                  }
                >
                  <MultiSelectTrigger
                    className="w-full min-w-0"
                    disabled={isSubmitting}
                    aria-invalid={!!errors.allowed_languages || undefined}
                  >
                    <MultiSelectValue
                      placeholder="Select languages…"
                      overflowBehavior="wrap"
                    />
                  </MultiSelectTrigger>
                  <MultiSelectContent
                    search={{ placeholder: "Search languages…", emptyMessage: "No languages found" }}
                  >
                    {LANGUAGES.map(({ value, label }) => (
                      <MultiSelectItem key={value} value={value}>
                        {label}
                      </MultiSelectItem>
                    ))}
                  </MultiSelectContent>
                </MultiSelect>
              )}
            />
            <FieldError>
              {(errors.allowed_languages as { message?: string } | undefined)
                ?.message}
            </FieldError>
          </Field>

          {/* Require identity verification */}
          <Field>
            <FieldLabel htmlFor="require_identity">
              Require identity verification
            </FieldLabel>
            <FieldDescription>
              Candidates must verify their identity with a government-issued ID
              before starting the interview.
            </FieldDescription>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <span className="text-sm text-muted-foreground">
                Enable identity check
              </span>
              <Controller
                control={control}
                name="require_identity"
                render={({ field }) => (
                  <Switch
                    id="require_identity"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                  />
                )}
              />
            </div>
          </Field>

          {/* Description */}
          <Field data-invalid={!!errors.description}>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea
              id="description"
              placeholder="Describe the role, required skills, and what you're looking for in a candidate."
              disabled={isSubmitting}
              rows={8}
              aria-invalid={!!errors.description || undefined}
              {...register("description")}
            />
            <FieldError>{errors.description?.message}</FieldError>
          </Field>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmitting || (requireDirty && !isDirty)}
          >
            <LoadingSwap isLoading={isSubmitting}>{submitLabel}</LoadingSwap>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
