"use client";

import { useRouter } from "@/i18n/navigation";
import { ChevronDown } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  checkInWorkerShiftAction,
  checkOutWorkerShiftAction,
  confirmWorkerShiftAction,
  declineWorkerShiftAction,
  requestWorkerShiftTransferAction,
} from "@/features/shifts/actions";
import {
  isConfirmedShiftStatus,
  isInProgressShiftStatus,
  isScheduledShiftStatus,
} from "@/features/shifts/lib/shift-status";
import { ShiftStatusBadge } from "./shift-status-badge";

const triggerClassName = cn(
  "inline-flex items-center gap-1 rounded-md border border-transparent p-0.5 outline-none",
  "hover:bg-accent/70 focus-visible:ring-2 focus-visible:ring-ring/60",
  "disabled:pointer-events-none disabled:opacity-60",
);

export function WorkerShiftTableStatusCell({
  shiftId,
  status,
}: {
  shiftId: string;
  status: string | null | undefined;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (isScheduledShiftStatus(status)) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={pending}
            className={triggerClassName}
            aria-label="Shift status — accept or decline"
          >
            <ShiftStatusBadge status={status} />
            <ChevronDown className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[10rem]">
          <DropdownMenuItem
            disabled={pending}
            onSelect={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const res = await confirmWorkerShiftAction(shiftId);
                if (res.error) {
                  toast.error(res.error);
                  return;
                }
                toast.success("Shift accepted");
                router.refresh();
              });
            }}
          >
            Accept shift
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={pending}
            onSelect={(e) => {
              e.preventDefault();
              if (!window.confirm("Decline this shift? Another worker may be assigned.")) {
                return;
              }
              startTransition(async () => {
                const res = await declineWorkerShiftAction(shiftId);
                if (res.error) {
                  toast.error(res.error);
                  return;
                }
                toast.success("Shift updated");
                router.push("/staff/shifts");
                router.refresh();
              });
            }}
          >
            Decline shift
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (isConfirmedShiftStatus(status)) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={pending}
            className={triggerClassName}
            aria-label="Shift status — check in or transfer"
          >
            <ShiftStatusBadge status={status} />
            <ChevronDown className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[12rem]">
          <DropdownMenuItem
            disabled={pending}
            onSelect={(e) => {
              e.preventDefault();
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
            Check in to start shift
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pending}
            onSelect={(e) => {
              e.preventDefault();
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
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (isInProgressShiftStatus(status)) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={pending}
            className={triggerClassName}
            aria-label="Shift status — check out"
          >
            <ShiftStatusBadge status={status} />
            <ChevronDown className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[12rem]">
          <DropdownMenuItem
            disabled={pending}
            onSelect={(e) => {
              e.preventDefault();
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
            Check out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return <ShiftStatusBadge status={status} />;
}
