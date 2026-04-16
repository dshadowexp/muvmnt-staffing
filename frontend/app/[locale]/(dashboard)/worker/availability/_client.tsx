"use client";

import {
  useActionState,
  useEffect,
  useRef,
  type ComponentProps,
} from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import type { WorkerAvailabilityInitial } from "@/features/availability/dal/queries";
import { WorkerAvailabilityScheduleForm } from "@/features/availability/components/worker-availability-schedule-form";
import {
  updateWorkerAvailabilityAppAction,
  type UpdateWorkerAvailabilityState,
} from "@/features/availability/actions";
import { Button } from "@/components/ui/button";
import { LoadingSwap } from "@/components/ui/loading-swap";

function SaveAvailabilitySubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="shrink-0" disabled={pending}>
      <LoadingSwap isLoading={pending}>Save</LoadingSwap>
    </Button>
  );
}

type Props = { initial: WorkerAvailabilityInitial };

export function AvailabilitySettingsClient({ initial }: Props) {
  const [state, formAction] = useActionState(
    updateWorkerAvailabilityAppAction,
    undefined as UpdateWorkerAvailabilityState,
  );
  const prevStateRef = useRef<UpdateWorkerAvailabilityState>(undefined);

  useEffect(() => {
    if (state === prevStateRef.current) return;
    prevStateRef.current = state;
    if (!state) return;
    if (state.ok === true) {
      toast.success("Availability saved");
    } else if (state.ok === false) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <WorkerAvailabilityScheduleForm
      initial={initial}
      formAction={
        formAction as NonNullable<ComponentProps<"form">["action"]>
      }
      header={
        <>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Availability</h1>
              <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                Set your weekly hours and timezone. This is used when matching you with
                shifts.
              </p>
            </div>
            <SaveAvailabilitySubmit />
          </div>
        </>
      }
    />
  );
}
