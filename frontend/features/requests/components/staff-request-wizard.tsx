"use client";

import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { ArrowLeft, CalendarIcon, MapPin } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { staffRequestScheduleSchema, type StaffRequestScheduleValues } from "../schema";
import { STAFF_REQUEST_PROFESSION_PLACEHOLDER } from "../constants";
import type {
  DaySchedule,
  PricingTierOffer,
  WorkerAssignment,
} from "../types/staff-match";
import {
  abandonStaffRequestDraftAction,
  confirmStaffRequestAction,
  createStaffRequestDraftAction,
  getStaffRequestPricingTiersAction,
  runStaffRequestMatchAction,
} from "../actions";
import {
  estimatedCoverageTotalCentsForHourly,
  estimatedTotalCentsForHourly,
  totalCoveredHoursFromMatchSchedule,
} from "../pricing/staff-request-pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MatchedWorkerAvatar } from "./matched-worker-avatar";
import { StaffRequestDailyTimeRows } from "./staff-request-daily-time-rows";
import { calendarDayStrings } from "../lib/calendar-day-strings";
import { reconcileDailyWindows } from "../lib/daily-windows-sync";
import { coerceStaffRequestWindowsForTodayLead } from "../lib/coerce-staff-request-windows-lead";

const STEP1_FORM_ID = "staff-request-wizard-step1";

const WIZARD_STEP_HEADING: Record<
  1 | 2 | 3,
  { title: string; description: string }
> = {
  1: {
    title: "Schedule request",
    description:
      "Choose how many staff you need, your dates, and shift times.",
  },
  2: {
    title: "Select tier",
    description:
      "Select the tier that best fits your request.",
  },
  3: {
    title: "Review coverage",
    description: "Review the proposed coverage, then post your request.",
  },
};

const step1Defaults: StaffRequestScheduleValues = {
  startDate: undefined as unknown as Date,
  endDate: null,
  positions: 1,
  dailyWindows: [],
};

function formatScheduleDayLabel(ymd: string) {
  return format(parseISO(`${ymd}T12:00:00`), "EEEE, MMM d, yyyy");
}

/** Preserve first-seen order; group workers who share the same coverage window. */
function assignmentsGroupedByTimeWindow(assignments: WorkerAssignment[]): WorkerAssignment[][] {
  const keys: string[] = [];
  const map = new Map<string, WorkerAssignment[]>();
  for (const a of assignments) {
    const key = `${a.startTime}\0${a.endTime}`;
    if (!map.has(key)) {
      keys.push(key);
      map.set(key, []);
    }
    map.get(key)!.push(a);
  }
  return keys.map((k) => map.get(k)!);
}

const MAX_COVERAGE_AVATARS_INLINE = 3;

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/** Shown over the schedule form while the draft is created and pricing tiers load. */
function WizardScheduleSubmitSkeleton() {
  return (
    <div
      className="flex min-w-0 flex-col gap-6"
      aria-busy="true"
      aria-label="Creating request and loading pricing"
    >
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-full max-w-md" />
        <Skeleton className="mt-2 h-10 w-full max-w-[12rem]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </div>
  );
}

/** Shown on the tier step while match runs (layout matches tier cards). */
function WizardPricingTiersBusySkeleton() {
  return (
    <div
      className="flex w-full flex-col gap-3"
      aria-busy="true"
      aria-label="Loading coverage preview"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-card p-4"
        >
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-full max-w-lg" />
          <Skeleton className="mt-2 h-4 w-full max-w-md" />
          <Skeleton className="mt-4 h-7 w-36" />
        </div>
      ))}
    </div>
  );
}

/** Shown while confirming and posting the request. */
function WizardConfirmPostSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label="Posting your request"
    >
      <Skeleton className="h-5 w-48" />
      <div className="flex justify-between gap-4 pt-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-10 w-36" />
      </div>
    </div>
  );
}

export function StaffRequestWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [scheduleForm, setScheduleForm] = useState<StaffRequestScheduleValues | null>(
    null,
  );
  const [jobId, setJobId] = useState<string | null>(null);
  const [matchSchedule, setMatchSchedule] = useState<DaySchedule[] | null>(null);
  const [fullyCovered, setFullyCovered] = useState(false);
  const [matchCandidateCount, setMatchCandidateCount] = useState(0);
  const [matchLoading, setMatchLoading] = useState(false);
  const [currency, setCurrency] = useState("CAD");
  const [pricingTiers, setPricingTiers] = useState<PricingTierOffer[] | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [selectedPricingRate, setSelectedPricingRate] = useState<number | null>(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  const step1Form = useForm<StaffRequestScheduleValues>({
    resolver: zodResolver(
      staffRequestScheduleSchema,
    ) as Resolver<StaffRequestScheduleValues>,
    defaultValues: step1Defaults,
  });
  const { getValues: getStep1Values, setValue: setStep1Value } = step1Form;

  async function handleStep1Continue(values: StaffRequestScheduleValues) {
    setScheduleForm(values);
    setMatchLoading(true);
    setMatchSchedule(null);
    setJobId(null);
    setPricingTiers(null);
    setSelectedTierId(null);
    setSelectedPricingRate(null);
    setFullyCovered(false);
    setMatchCandidateCount(0);

    const created = await createStaffRequestDraftAction(values);
    if (created.error) {
      setMatchLoading(false);
      toast.error(created.message);
      return;
    }

    const tiersRes = await getStaffRequestPricingTiersAction(created.data.jobId);
    setMatchLoading(false);

    if (tiersRes.error) {
      toast.error(tiersRes.message);
      void abandonStaffRequestDraftAction(created.data.jobId);
      return;
    }

    setJobId(created.data.jobId);
    setPricingTiers(tiersRes.data.tiers);
    setCurrency(tiersRes.data.currency);
    setStep(2);
  }

  async function handleBackFromTierStep() {
    if (jobId) {
      const abandoned = await abandonStaffRequestDraftAction(jobId);
      if (abandoned.error) {
        toast.error(abandoned.message ?? "Could not go back");
        return;
      }
    }
    setJobId(null);
    setMatchSchedule(null);
    setPricingTiers(null);
    setSelectedTierId(null);
    setSelectedPricingRate(null);
    setFullyCovered(false);
    setMatchCandidateCount(0);
    setStep(1);
  }

  async function handleTierContinue() {
    if (!jobId || !selectedTierId || selectedPricingRate == null) {
      toast.error("Select a pricing tier to continue.");
      return;
    }

    setMatchLoading(true);
    setMatchSchedule(null);

    const res = await runStaffRequestMatchAction({
      jobId,
      pricingTier: selectedTierId,
      pricingRate: selectedPricingRate,
    });

    setMatchLoading(false);

    if (res.error) {
      toast.error(res.message);
      return;
    }

    setMatchSchedule(res.data.schedule);
    setFullyCovered(res.data.fullyCovered);
    setMatchCandidateCount(res.data.candidateCount ?? 0);
    setCurrency(res.data.currency);
    setSelectedPricingRate(res.data.pricingRate);
    setStep(3);
  }

  async function handleConfirmPost() {
    if (!jobId) return;

    setConfirmSubmitting(true);
    try {
      const result = await confirmStaffRequestAction({
        jobId,
        notes: "",
      });
      if (result && "error" in result && result.error) {
        toast.error(result.message ?? "Could not confirm request");
        setConfirmSubmitting(false);
      }
    } catch {
      /* redirect() throws — let navigation proceed */
    }
  }

  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const startDateVal = useWatch({ control: step1Form.control, name: "startDate" });
  const endDateVal = useWatch({ control: step1Form.control, name: "endDate" });
  const dailyWindowsVal = useWatch({
    control: step1Form.control,
    name: "dailyWindows",
  });

  useEffect(() => {
    if (!startDateVal || Number.isNaN(startDateVal.getTime())) {
      const cur = getStep1Values("dailyWindows");
      if (cur.length > 0) {
        setStep1Value("dailyWindows", [], { shouldValidate: true });
      }
      return;
    }
    const days = calendarDayStrings(startDateVal, endDateVal);
    const prev = getStep1Values("dailyWindows") ?? [];
    const next = reconcileDailyWindows(prev, days);
    const coerced = coerceStaffRequestWindowsForTodayLead(next);
    if (JSON.stringify(prev) !== JSON.stringify(coerced)) {
      setStep1Value("dailyWindows", coerced, { shouldValidate: true });
    }
  }, [startDateVal, endDateVal, getStep1Values, setStep1Value]);

  const step1Busy = step === 1 && matchLoading;
  const step2Busy = step === 2 && matchLoading;

  useEffect(() => {
    if (step1Busy) {
      setStartDateOpen(false);
      setEndDateOpen(false);
    }
  }, [step1Busy]);

  const schedulePricingDraft = useMemo(() => {
    if (!scheduleForm) return null;
    return {
      profession: STAFF_REQUEST_PROFESSION_PLACEHOLDER,
      start_date: scheduleForm.startDate.toISOString(),
      end_date: scheduleForm.endDate ? scheduleForm.endDate.toISOString() : null,
      positions: scheduleForm.positions,
      dailyWindows: scheduleForm.dailyWindows,
    };
  }, [scheduleForm]);

  const fullRequestEstimateCents = useMemo(() => {
    if (
      !schedulePricingDraft ||
      selectedPricingRate == null ||
      !Number.isFinite(selectedPricingRate)
    ) {
      return null;
    }
    return estimatedTotalCentsForHourly(schedulePricingDraft, selectedPricingRate);
  }, [schedulePricingDraft, selectedPricingRate]);

  const coverageHours =
    matchSchedule != null ? totalCoveredHoursFromMatchSchedule(matchSchedule) : 0;

  const confirmEstimateCents = useMemo(() => {
    if (
      !matchSchedule ||
      selectedPricingRate == null ||
      !Number.isFinite(selectedPricingRate)
    ) {
      return null;
    }
    return estimatedCoverageTotalCentsForHourly(matchSchedule, selectedPricingRate);
  }, [matchSchedule, selectedPricingRate]);

  const hasAssignedCoverage =
    matchSchedule != null &&
    matchSchedule.some((d) => d.assignments.length > 0);

  const canConfirmCoverage = hasAssignedCoverage && coverageHours > 0;

  let loadingSkeleton: ReactNode = null;
  if (step1Busy) loadingSkeleton = <WizardScheduleSubmitSkeleton />;
  else if (step2Busy) loadingSkeleton = <WizardPricingTiersBusySkeleton />;
  else if (step === 3 && confirmSubmitting) {
    loadingSkeleton = <WizardConfirmPostSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {WIZARD_STEP_HEADING[step].title}
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          {WIZARD_STEP_HEADING[step].description}
        </p>
      </div>

      <div className={cn(step !== 1 && "hidden")} aria-hidden={step !== 1}>
        <form
          id={STEP1_FORM_ID}
          className="space-y-6"
          onSubmit={step1Form.handleSubmit(async (v) => {
            await handleStep1Continue(v);
          })}
        >
          <FieldGroup>
            <div className="relative">
              {step1Busy ? (
                <div
                  className="absolute inset-0 z-10 flex justify-center rounded-xl border border-border/60 bg-background/95 p-4 backdrop-blur-sm sm:p-6"
                  aria-live="polite"
                >
                  <div className="w-full max-w-xl">{loadingSkeleton}</div>
                </div>
              ) : null}
              <fieldset
                disabled={step1Busy}
                className="min-w-0 space-y-6 border-0 p-0 disabled:pointer-events-none disabled:opacity-[0.65]"
              >
            <Field data-invalid={!!step1Form.formState.errors.positions}>
              <FieldLabel htmlFor="wiz-positions">Staff count</FieldLabel>
              <FieldDescription>
                How many personnel you need for the selected dates and shift times.

              </FieldDescription>
              <Input
                id="wiz-positions"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                {...step1Form.register("positions", { valueAsNumber: true })}
              />
              <FieldError>{step1Form.formState.errors.positions?.message}</FieldError>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!step1Form.formState.errors.startDate}>
                <FieldLabel>Start date</FieldLabel>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDateVal && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {startDateVal
                        ? format(startDateVal, "PPP")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDateVal}
                      onSelect={(d) => {
                        if (d) {
                          step1Form.setValue("startDate", d, { shouldValidate: true });
                          setStartDateOpen(false);
                        }
                      }}
                      disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                  </PopoverContent>
                </Popover>
                <FieldError>{step1Form.formState.errors.startDate?.message}</FieldError>
              </Field>

              <Field data-invalid={!!step1Form.formState.errors.endDate}>
                <FieldLabel>End date</FieldLabel>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDateVal && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {endDateVal
                        ? format(endDateVal, "PPP")
                        : "Same day"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDateVal ?? undefined}
                      onSelect={(d) => {
                        step1Form.setValue("endDate", d ?? null, {
                          shouldValidate: true,
                        });
                        setEndDateOpen(false);
                      }}
                      disabled={(d) => {
                        if (!startDateVal) return true;
                        return d < startDateVal;
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <FieldError>{step1Form.formState.errors.endDate?.message}</FieldError>
              </Field>
            </div>

            {startDateVal && !Number.isNaN(startDateVal.getTime()) ? (
              <div
                className="space-y-2"
                data-invalid={!!step1Form.formState.errors.dailyWindows}
              >
                <StaffRequestDailyTimeRows
                  windows={dailyWindowsVal ?? []}
                  disabled={step1Busy}
                  onChange={(next) =>
                    step1Form.setValue("dailyWindows", next, { shouldValidate: true })
                  }
                />
                <FieldError>
                  {step1Form.formState.errors.dailyWindows?.message}
                </FieldError>
              </div>
            ) : null}
              </fieldset>
            </div>
          </FieldGroup>

          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={step1Form.formState.isSubmitting || matchLoading}
            >
              <LoadingSwap
                isLoading={step1Form.formState.isSubmitting || matchLoading}
              >
                <span className="inline-flex items-center gap-2">
                  Submit
                  <MapPin className="size-4 opacity-80" />
                </span>
              </LoadingSwap>
            </Button>
          </div>
        </form>
      </div>

      {step === 2 ? (
        <div className="flex flex-col gap-6">
          {step2Busy ? (
            <WizardPricingTiersBusySkeleton />
          ) : pricingTiers && pricingTiers.length > 0 ? (
            <>
              <div className="flex w-full flex-col gap-3">
                {pricingTiers.map((tier) => {
                  const isSelected =
                    tier.available && selectedTierId === tier.tierId;
                  const rateCents =
                    Number.isFinite(tier.hourlyRate) && tier.hourlyRate > 0
                      ? Math.round(tier.hourlyRate * 100)
                      : null;
                  return (
                    <button
                      key={tier.tierId}
                      type="button"
                      disabled={!tier.available}
                      onClick={() => {
                        setSelectedTierId(tier.tierId);
                        setSelectedPricingRate(tier.hourlyRate);
                      }}
                      className={cn(
                        "rounded-2xl border border-border bg-card p-4 text-left outline-none",
                        "transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out",
                        "focus-visible:ring-2 focus-visible:ring-ring/60",
                        tier.available &&
                          "cursor-pointer hover:-translate-y-0.5 hover:bg-muted/50 hover:shadow-md active:translate-y-0 active:scale-[0.99] active:shadow-sm",
                        tier.available &&
                          !isSelected &&
                          "hover:border-ring",
                        !tier.available && "cursor-not-allowed opacity-50",
                        isSelected &&
                          "border-primary bg-primary/5 shadow-md ring-2 ring-primary/25 hover:bg-primary/10 hover:shadow-lg",
                      )}
                    >
                      <p className="text-foreground text-base font-semibold">{tier.label}</p>
                      <p className="text-muted-foreground mt-1 text-sm leading-snug">
                        {tier.description}
                      </p>
                      <p className="text-foreground mt-3 text-lg font-semibold tabular-nums">
                        {rateCents != null ? (
                          <>
                            {formatMoney(rateCents, currency)}
                            <span className="text-muted-foreground ml-1 text-base font-semibold">
                              /hr
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </p>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">No pricing tiers available.</p>
          )}

          <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground"
              disabled={step2Busy}
              onClick={() => void handleBackFromTierStep()}
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={!selectedTierId || step2Busy}
              onClick={() => void handleTierContinue()}
            >
              <LoadingSwap isLoading={step2Busy}>
                <span>View coverage</span>
              </LoadingSwap>
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 && scheduleForm && jobId && matchSchedule ? (
        <div className="relative">
          {confirmSubmitting ? (
            <div
              className="absolute inset-0 z-10 flex justify-center rounded-xl border border-border/60 bg-background/95 p-4 backdrop-blur-sm sm:p-6"
              aria-live="polite"
            >
              <div className="w-full max-w-xl">{loadingSkeleton}</div>
            </div>
          ) : null}
        <div
          className={cn(
            "flex flex-col gap-6",
            confirmSubmitting && "pointer-events-none opacity-60",
          )}
        >
              {matchCandidateCount === 0 ? (
                <div
                  role="status"
                  className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50"
                >
                  No active workers were found for this tier and region. Try another tier,
                  adjust your dates or shift windows, or contact support if you believe this is
                  a mistake.
                </div>
              ) : !hasAssignedCoverage ? (
                <div
                  role="status"
                  className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50"
                >
                  No workers could be matched to your requested times for the days shown below.
                  Try different dates or shift windows.
                </div>
              ) : !fullyCovered ? (
                <div
                  role="status"
                  className="rounded-xl border border-sky-500/35 bg-sky-500/10 px-4 py-3 text-sm text-sky-950 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-50"
                >
                  Your request is only partially covered. The total below is an estimate for
                  matched hours only, not for the full schedule you requested.
                </div>
              ) : null}

              {matchSchedule.length === 0 ? (
                <p className="text-muted-foreground text-sm">No schedule days returned.</p>
              ) : (
                <ul className="space-y-4">
                  {matchSchedule.map((day) => (
                    <li
                      key={day.date}
                      className="rounded-2xl border border-border bg-card p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                        <p className="font-medium">{formatScheduleDayLabel(day.date)}</p>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            day.covered
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {day.covered ? "Covered" : "Not covered"}
                        </span>
                      </div>
                      {day.assignments.length === 0 ? (
                        <p className="text-muted-foreground mt-3 text-sm">
                          No worker assigned for this day.
                        </p>
                      ) : (
                        <ul className="mt-3 space-y-3">
                          {assignmentsGroupedByTimeWindow(day.assignments).map((group) => {
                            const first = group[0]!;
                            const windowKey = `${first.startTime}-${first.endTime}`;
                            const windowDisplay = `${formatTime(first.startTime)} – ${formatTime(first.endTime)}`;
                            const years = group.map((g) => g.yearsExp);
                            const yMin = Math.min(...years);
                            const yMax = Math.max(...years);
                            const yearsLabel =
                              yMin === yMax
                                ? `${yMin} yrs exp`
                                : `${yMin}–${yMax} yrs exp`;
                            const names = group.map((g) => g.displayName).join(", ");
                            const rowKey = `${day.date}-${windowKey}-${group.map((g) => g.userId).join("-")}`;

                            if (group.length === 1) {
                              const a = group[0]!;
                              return (
                                <li
                                  key={rowKey}
                                  className="flex min-w-0 items-center gap-3"
                                >
                                  <MatchedWorkerAvatar
                                    photoUrl={a.photoUrl}
                                    displayName={a.displayName}
                                    className="shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium">{a.displayName}</p>
                                    <p className="text-muted-foreground text-xs">
                                      {a.yearsExp} yrs exp
                                    </p>
                                  </div>
                                  <span className="text-muted-foreground shrink-0 text-right text-sm tabular-nums">
                                    {windowDisplay}
                                  </span>
                                </li>
                              );
                            }

                            const visible = group.slice(0, MAX_COVERAGE_AVATARS_INLINE);
                            const overflow = group.length - visible.length;
                            const overflowWorkers = group.slice(MAX_COVERAGE_AVATARS_INLINE);

                            return (
                              <li
                                key={rowKey}
                                className="flex min-w-0 items-center gap-3"
                              >
                                <AvatarGroup className="shrink-0">
                                  {visible.map((a) => (
                                    <Tooltip key={a.userId}>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex shrink-0 cursor-default">
                                          <MatchedWorkerAvatar
                                            photoUrl={a.photoUrl}
                                            displayName={a.displayName}
                                            size="sm"
                                          />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-xs">
                                        <p className="font-medium leading-tight">{a.displayName}</p>
                                        <p className="text-muted-foreground text-xs">
                                          {a.yearsExp} yrs exp.
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ))}
                                  {overflow > 0 ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <AvatarGroupCount
                                          className="cursor-default"
                                          aria-label={`${overflow} more assigned`}
                                        >
                                          +{overflow}
                                        </AvatarGroupCount>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-xs">
                                        <ul className="space-y-1.5 text-sm">
                                          {overflowWorkers.map((a) => (
                                            <li key={a.userId}>
                                              <span className="font-medium">{a.displayName}</span>
                                              <span className="text-muted-foreground text-xs">
                                                {" "}
                                                · {a.yearsExp} yrs exp
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : null}
                                </AvatarGroup>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium">{names}</p>
                                  <p className="text-muted-foreground text-xs">{yearsLabel}</p>
                                </div>
                                <span className="text-muted-foreground shrink-0 text-right text-sm tabular-nums">
                                  {windowDisplay}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}

          <div
            className={cn(
              "rounded-2xl border-2 p-5 sm:p-6",
              confirmEstimateCents != null ||
                (selectedPricingRate != null && Number.isFinite(selectedPricingRate))
                ? "border-primary/45 bg-primary/5 shadow-sm"
                : "border-border bg-muted/20",
            )}
            aria-live="polite"
          >
            <div className="grid gap-6 sm:grid-cols-2 sm:items-end sm:gap-8">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Hourly rate</p>
                {selectedPricingRate != null && Number.isFinite(selectedPricingRate) ? (
                  <p className="text-foreground mt-2 text-lg tracking-tight tabular-nums sm:text-xl">
                    {formatMoney(Math.round(selectedPricingRate * 100), currency)}
                    <span className="text-muted-foreground ml-1 text-base font-semibold sm:text-lg">
                      /hr
                    </span>
                  </p>
                ) : (
                  <p className="text-muted-foreground mt-2 text-2xl font-semibold tabular-nums">—</p>
                )}
              </div>
              <div className="sm:text-right">
                <p className="text-muted-foreground text-sm font-medium">Total</p>
                {confirmEstimateCents != null ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-foreground text-xl font-bold tracking-tight tabular-nums sm:text-2xl">
                      {formatMoney(confirmEstimateCents, currency)}
                    </p>
                    {!fullyCovered &&
                    fullRequestEstimateCents != null &&
                    fullRequestEstimateCents !== confirmEstimateCents ? (
                      <p className="text-muted-foreground text-xs tabular-nums sm:text-sm">
                        Full schedule would be about {formatMoney(fullRequestEstimateCents, currency)}{" "}
                        if every window were covered.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-muted-foreground mt-2 text-2xl font-semibold tabular-nums">—</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground"
              disabled={confirmSubmitting}
              onClick={() => setStep(2)}
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={confirmSubmitting || !canConfirmCoverage}
              onClick={() => void handleConfirmPost()}
            >
              <LoadingSwap isLoading={confirmSubmitting}>
                <span>Confirm request</span>
              </LoadingSwap>
            </Button>
          </div>
        </div>
        </div>
      ) : null}
    </div>
  );
}
