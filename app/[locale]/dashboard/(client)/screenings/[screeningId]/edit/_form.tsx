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
    router.push(`/dashboard/screenings/${screening.id}`);
  }

  return (
    <ScreeningForm
      defaultValues={{ title: screening.title, description: screening.description }}
      onSubmit={onSubmit}
      submitLabel="Save changes"
      requireDirty
    />
  );
}
