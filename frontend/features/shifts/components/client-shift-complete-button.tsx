"use client";

import { useRouter } from "@/i18n/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { completeClientShiftAction } from "@/features/shifts/actions";
import { LoadingSwap } from "@/components/ui/loading-swap";

export function ClientShiftCompleteButton({ shiftId }: { shiftId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="lg"
      disabled={pending}
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
    >
      <LoadingSwap isLoading={pending}>
        <span>Confirm shift completed</span>
      </LoadingSwap>
    </Button>
  );
}
