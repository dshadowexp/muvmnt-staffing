"use client";

import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { ScreeningForm } from "@/features/screenings/components/screening-form";
import type { ScreeningFormValues } from "@/features/screenings/components/screening-form";
import { createScreeningAction } from "@/features/screenings/actions";

export function NewScreeningForm() {
  const router = useRouter();

  async function onSubmit(data: ScreeningFormValues) {
    const result = await createScreeningAction(data);
    if (result.error) {
      toast.error(result.message);
      return;
    }
    toast.success("Screening created");
    router.push(`/dashboard/screenings/${result.id}`);
  }

  return (
    <ScreeningForm
      onSubmit={onSubmit}
      submitLabel={
        <span className="inline-flex items-center gap-2">
          Create Screening
          <ArrowRight className="size-4" />
        </span>
      }
    />
  );
}
