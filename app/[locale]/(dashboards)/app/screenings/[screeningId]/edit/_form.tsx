"use client";

import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { ScreeningForm } from "@/features/screenings/components/screening-form";
import type { ScreeningFormValues } from "@/features/screenings/components/screening-form";
import { updateScreeningAction } from "@/features/screenings/actions";
import type { ScreeningRow } from "@/features/screenings/dal/queries";

type Props = { screening: ScreeningRow };

export function EditScreeningForm({ screening }: Props) {
  const router = useRouter();

  async function onSubmit(data: ScreeningFormValues) {
    const result = await updateScreeningAction(screening.id, data);
    if (result.error) {
      toast.error(result.message);
      return;
    }
    toast.success("Screening updated");
    router.push(`/app/screenings/${screening.id}`);
  }

  return (
    <ScreeningForm
      defaultValues={{
          title: screening.title,
          description: screening.description,
          deadline_days: screening.deadline_days,
          interview_duration: screening.interview_duration,
          allowed_languages: (screening.allowed_languages ?? []).filter(
            (l): l is "en" | "fr" => l === "en" || l === "fr"
          ),
          require_identity: screening.require_identity,
        }}
      onSubmit={onSubmit}
      submitLabel="Save changes"
      requireDirty
    />
  );
}
