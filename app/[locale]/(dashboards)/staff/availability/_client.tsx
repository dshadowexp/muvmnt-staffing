"use client";

import {
  Suspense,
  use,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import type { WorkerAvailabilityInitial } from "@/features/availability/dal/queries";
import {
  WorkerAvailabilityScheduleFields,
  WorkerAvailabilityScheduleFieldsSkeleton,
} from "@/features/availability/components/worker-availability-schedule-form";
import {
  updateWorkerAvailabilityAppAction,
  type UpdateWorkerAvailabilityState,
} from "@/features/availability/actions";
import { Button } from "@/components/ui/button";
import { LoadingSwap } from "@/components/ui/loading-swap";

type Props = { dataPromise: Promise<WorkerAvailabilityInitial> };

export function AvailabilitySettingsClient({ dataPromise }: Props) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateWorkerAvailabilityAppAction,
    undefined as UpdateWorkerAvailabilityState,
  );
  const prevStateRef = useRef<UpdateWorkerAvailabilityState>(undefined);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (state === prevStateRef.current) return;
    prevStateRef.current = state;
    if (!state) return;
    if (state.ok === true) {
      toast.success("Availability saved");
      setIsDirty(false);
      router.push("/staff/availability");
    } else if (state.ok === false) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form
      action={formAction as NonNullable<ComponentProps<"form">["action"]>}
      className="space-y-8"
    >
      {/*
        A single `<fieldset>` with `display: contents` disables every control
        inside during submission without altering layout. Native buttons,
        inputs, and Radix primitives (Switch/Select/Popover triggers) all
        forward `disabled`, so interaction is fully blocked while pending.
      */}
      <fieldset
        disabled={isPending}
        className="contents"
        aria-busy={isPending}
      >
        {/* Header renders instantly — no waiting on the data fetch. */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="shrink-0"
              disabled={isPending}
            >
              <Link
                href="/staff/availability"
                aria-label="Back to availability"
                aria-disabled={isPending}
                tabIndex={isPending ? -1 : undefined}
                onClick={(e) => {
                  if (isPending) e.preventDefault();
                }}
              >
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Edit availability
              </h1>
              <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                Update your working hours and timezone.
              </p>
            </div>
          </div>
          <Button
            type="submit"
            size="lg"
            className="shrink-0"
            disabled={isPending || !isDirty}
          >
            <LoadingSwap isLoading={isPending}>Save</LoadingSwap>
          </Button>
        </div>

        {/* Data-dependent fields stream in behind their own Suspense. */}
        <Suspense fallback={<WorkerAvailabilityScheduleFieldsSkeleton />}>
          <FieldsSlot
            dataPromise={dataPromise}
            onDirtyChange={setIsDirty}
          />
        </Suspense>
      </fieldset>
    </form>
  );
}

function FieldsSlot({
  dataPromise,
  onDirtyChange,
}: {
  dataPromise: Promise<WorkerAvailabilityInitial>;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const initial = use(dataPromise);
  return (
    <WorkerAvailabilityScheduleFields
      initial={initial}
      onDirtyChange={onDirtyChange}
    />
  );
}
