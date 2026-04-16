"use client";

import { useRouter } from "@/i18n/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  cancelWorkerShiftAction,
  checkInWorkerShiftAction,
  checkOutWorkerShiftAction,
  confirmWorkerShiftAction,
  declineWorkerShiftAction,
  requestWorkerShiftTransferAction,
} from "@/features/shifts/actions";
import {
  isCheckedOutShiftStatus,
  isCompletedShiftStatus,
  isConfirmedShiftStatus,
  isDeclinedShiftStatus,
  isInProgressShiftStatus,
  isReassigningShiftStatus,
  isScheduledShiftStatus,
  normalizeShiftStatus,
} from "@/features/shifts/lib/shift-status";

export function WorkerShiftActions({
  shiftId,
  status,
}: {
  shiftId: string;
  status: string | null | undefined;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const s = normalizeShiftStatus(status);

  if (isScheduledShiftStatus(status)) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          type="button"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const res = await confirmWorkerShiftAction(shiftId);
              if (res.error) {
                toast.error(res.error);
                return;
              }
              toast.success("Shift confirmed");
              router.refresh();
            });
          }}
        >
          {isPending ? "…" : "Confirm shift"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => {
            if (!window.confirm("Decline this shift? Another worker may be assigned.")) return;
            startTransition(async () => {
              const res = await declineWorkerShiftAction(shiftId);
              if (res.error) {
                toast.error(res.error);
                return;
              }
              toast.success("Shift updated");
              router.push("/worker/shifts");
              router.refresh();
            });
          }}
        >
          Decline
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={isPending}
          onClick={() => {
            if (!window.confirm("Cancel this shift?")) return;
            startTransition(async () => {
              const res = await cancelWorkerShiftAction(shiftId);
              if (res.error) {
                toast.error(res.error);
                return;
              }
              toast.success("Shift cancelled");
              router.refresh();
            });
          }}
        >
          Cancel shift
        </Button>
      </div>
    );
  }

  if (isReassigningShiftStatus(status)) {
    return (
      <p className="text-muted-foreground text-sm">
        We&apos;re looking for another worker to take this shift. You can refresh this page
        in a few moments for updates.
      </p>
    );
  }

  if (isConfirmedShiftStatus(status)) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          type="button"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const res = await checkInWorkerShiftAction(shiftId);
              if (res.error) {
                toast.error(res.error);
                return;
              }
              toast.success("Checked in — shift in progress");
              router.refresh();
            });
          }}
        >
          {isPending ? "…" : "Check in to start shift"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => {
            if (
              !window.confirm(
                "Request a transfer? We’ll look for another worker for this shift. You may keep the shift if no one is available.",
              )
            ) {
              return;
            }
            startTransition(async () => {
              const res = await requestWorkerShiftTransferAction(shiftId);
              if (res.error) {
                toast.error(res.error);
                return;
              }
              toast.success("Transfer queued — finding a replacement");
              router.refresh();
            });
          }}
        >
          Transfer shift
        </Button>
      </div>
    );
  }

  if (isInProgressShiftStatus(status)) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <p className="text-muted-foreground text-sm sm:mr-2">
          This shift is in progress. Check out when you are done.
        </p>
        <Button
          type="button"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const res = await checkOutWorkerShiftAction(shiftId);
              if (res.error) {
                toast.error(res.error);
                return;
              }
              toast.success("Checked out — waiting for client confirmation");
              router.refresh();
            });
          }}
        >
          {isPending ? "…" : "Check out"}
        </Button>
      </div>
    );
  }

  if (isCheckedOutShiftStatus(status)) {
    return (
      <p className="text-muted-foreground text-sm">
        You have checked out. The client will confirm when the shift is complete.
      </p>
    );
  }

  if (isCompletedShiftStatus(status)) {
    return (
      <p className="text-muted-foreground text-sm">This shift is complete.</p>
    );
  }

  if (isDeclinedShiftStatus(status)) {
    return (
      <p className="text-muted-foreground text-sm">
        This shift is no longer staffed (declined with no replacement available).
      </p>
    );
  }

  if (s === "cancelled" || s === "canceled") {
    return (
      <p className="text-muted-foreground text-sm">This shift was cancelled.</p>
    );
  }

  return (
    <p className="text-muted-foreground text-sm">
      No actions are available for this shift status.
    </p>
  );
}
