"use client";

import { useRouter } from "@/i18n/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { completeClientShiftAction } from "@/features/shifts/actions";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { ShiftActionCard } from "@/features/shifts/components/shift-action-card";

export function ClientShiftCompleteButton({ shiftId }: { shiftId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <ShiftActionCard
      disabled={pending}
      title={
        <LoadingSwap isLoading={pending}>
          <span>Confirm shift completed</span>
        </LoadingSwap>
      }
      description="Confirm that worker completed the shift."
      onClick={() => {
        startTransition(async () => {
          const res = await completeClientShiftAction(shiftId);
          if (res.error) {
            toast.error(res.error);
            return;
          }
          toast.success("Shift marked complete");
          router.refresh();
        });
      }}
    />
  );
}
