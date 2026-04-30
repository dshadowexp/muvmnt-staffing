"use client";

import { useRouter } from "@/i18n/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  checkInWorkerShiftAction,
  checkOutWorkerShiftAction,
  confirmWorkerShiftAction,
  declineWorkerShiftAction,
  requestWorkerShiftTransferAction,
} from "@/features/shifts/actions";
import { ShiftActionCard } from "@/features/shifts/components/shift-action-card";
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ShiftActionCard
          title="Confirm shift"
          description="Accept this booking. You can check in when you arrive on site."
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
        />
        <ShiftActionCard
          title="Decline shift"
          description="Another worker may be assigned. Only decline if you cannot work this shift."
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
        />
      </div>
    );
  }

  if (isReassigningShiftStatus(status)) {
    return (
      <p className="text-muted-foreground text-sm">
        We&apos;re looking for another worker to take this shift. You can refresh this page in a few
        moments for updates.
      </p>
    );
  }

  if (isConfirmedShiftStatus(status)) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ShiftActionCard
          title="Check in to start shift"
          description="Start the clock when you arrive and are ready to work."
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
        />
        <ShiftActionCard
          title="Transfer shift"
          description="We’ll look for another worker. You may keep the shift if no one is available."
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
        />
      </div>
    );
  }

  if (isInProgressShiftStatus(status)) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          This shift is in progress. Check out when you are done.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ShiftActionCard
            title="Check out"
            description="End your shift when you finish. The client will confirm completion afterward."
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
          />
        </div>
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
    return <p className="text-muted-foreground text-sm">This shift is complete.</p>;
  }

  if (isDeclinedShiftStatus(status)) {
    return (
      <p className="text-muted-foreground text-sm">
        This shift is no longer staffed (declined with no replacement available).
      </p>
    );
  }

  if (s === "cancelled" || s === "canceled") {
    return <p className="text-muted-foreground text-sm">This shift was cancelled.</p>;
  }

  return (
    <p className="text-muted-foreground text-sm">No actions are available for this shift status.</p>
  );
}
