"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { LoadingSwap } from "@/components/ui/loading-swap";

export const screeningSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
});

export type ScreeningFormValues = z.infer<typeof screeningSchema>;

type Props = {
  defaultValues?: ScreeningFormValues;
  onSubmit: (data: ScreeningFormValues) => Promise<void>;
  submitLabel: React.ReactNode;
  /** When true, Save is disabled until the user makes a change. */
  requireDirty?: boolean;
};

export function ScreeningForm({
  defaultValues = { title: "", description: "" },
  onSubmit,
  submitLabel,
  requireDirty = false,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ScreeningFormValues>({
    defaultValues,
    resolver: zodResolver(screeningSchema) as Resolver<ScreeningFormValues>,
  });

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-6">
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
