"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ProfessionalRole, tryNormalizeProfessionId } from "@/lib/professions";
import { PROFESSIONAL_ROLES } from "@/lib/constants";
import {
  workerProfessionExperienceSchema,
  type WorkerProfessionExperienceValues,
} from "@/features/profile/schemas/worker";
import { updateWorkerProfessionAndExperienceAction } from "@/features/profile/actions/worker-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingSwap } from "@/components/ui/loading-swap";
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/components/ui/multi-select";

export function ProfessionExperienceCard({
  profession,
  yearsExp,
  locked = false,
}: {
  profession: string;
  yearsExp: number;
  /** When true the edit button is hidden and the card is read-only.
   *  Workers can only change profession/experience in the picture or interview stage. */
  locked?: boolean;
}) {
  const router = useRouter();
  const tProf = useTranslations("professions");
  const [isEditing, setIsEditing] = useState(false);
  const resolvedProfessionId = tryNormalizeProfessionId(profession);
  const professionFormValue = resolvedProfessionId ?? "other";

  const form = useForm<WorkerProfessionExperienceValues>({
    resolver: zodResolver(workerProfessionExperienceSchema),
    defaultValues: {
      profession: professionFormValue,
      yearsExp,
    },
  });

  const {
    formState: { isDirty, isSubmitting, errors },
  } = form;

  async function onSubmit(values: WorkerProfessionExperienceValues) {
    const res = await updateWorkerProfessionAndExperienceAction(values);
    if (res.error) {
      toast.error(res.message);
      return;
    }
    toast.success(res.message);
    // Reset form with the newly-saved values so the dirty baseline updates.
    form.reset(values);
    setIsEditing(false);
    router.refresh();
  }

  function cancelEdit() {
    form.reset({ profession: professionFormValue, yearsExp });
    setIsEditing(false);
  }

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Profession &amp; experience</CardTitle>
            <CardDescription>
              Your primary healthcare role and years of experience.
            </CardDescription>
          </div>
          {!locked && !isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="shrink-0"
            >
              <Pencil className="size-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing && !locked ? (
          <form
            onSubmit={form.handleSubmit((v) => void onSubmit(v))}
            className="space-y-4"
          >
            <fieldset
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="contents"
            >
              <FieldGroup>
                <Field data-invalid={!!errors.profession}>
                  <FieldLabel>Profession</FieldLabel>
                  <FieldDescription>Your primary healthcare role</FieldDescription>
                  <input type="hidden" {...form.register("profession")} />
                  <MultiSelect
                    single
                    values={
                      form.watch("profession")
                        ? [form.watch("profession")]
                        : []
                    }
                    onValuesChange={(v) =>
                      form.setValue(
                        "profession",
                        (v[0] ?? "") as ProfessionalRole,
                        { shouldValidate: true, shouldDirty: true },
                      )
                    }
                  >
                    <MultiSelectTrigger className="w-full">
                      <MultiSelectValue placeholder="Select profession..." />
                    </MultiSelectTrigger>
                    <MultiSelectContent
                      search={{ placeholder: "Search profession..." }}
                    >
                      <MultiSelectGroup>
                        {(PROFESSIONAL_ROLES as ProfessionalRole[]).map(
                          (role) => (
                            <MultiSelectItem key={role} value={role}>
                              {tProf(role)}
                            </MultiSelectItem>
                          ),
                        )}
                      </MultiSelectGroup>
                    </MultiSelectContent>
                  </MultiSelect>
                  <FieldError>{errors.profession?.message}</FieldError>
                </Field>
                <Field data-invalid={!!errors.yearsExp}>
                  <FieldLabel htmlFor="profession-years-exp">
                    Years of experience
                  </FieldLabel>
                  <Input
                    id="profession-years-exp"
                    type="number"
                    min={0}
                    step={1}
                    {...form.register("yearsExp", { valueAsNumber: true })}
                  />
                  <FieldError>{errors.yearsExp?.message}</FieldError>
                </Field>
              </FieldGroup>
              <div className="flex gap-2 mt-4 justify-end">
                <Button type="button" variant="ghost" onClick={cancelEdit}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!isDirty || isSubmitting}>
                  <LoadingSwap isLoading={isSubmitting}>Save changes</LoadingSwap>
                </Button>
                
              </div>
            </fieldset>
          </form>
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-[minmax(8rem,10rem)_1fr] sm:gap-x-4">
            <dt className="text-muted-foreground font-medium">Profession</dt>
            <dd>
              {resolvedProfessionId ? tProf(resolvedProfessionId) : "—"}
            </dd>
            <dt className="text-muted-foreground font-medium">
              Years of experience
            </dt>
            <dd>{yearsExp}</dd>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
