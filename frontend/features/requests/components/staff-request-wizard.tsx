"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  ArrowLeft,
  CalendarIcon,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { JOB_TASKS, PROFESSIONAL_ROLES } from "@/lib/constants";
import type { ProfessionalRole } from "@/types";
import {
  staffRequestWizardConfirmSchema,
  staffRequestWizardStep1Schema,
  type StaffRequestWizardConfirmValues,
  type StaffRequestWizardStep1Values,
} from "../schema";
import type { StaffMatchTier, StaffMatchTierId } from "../types/staff-match";
import {
  abandonStaffRequestDraftAction,
  createStaffRequestAndMatchAction,
  finalizeStaffRequestMatchAction,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/components/ui/multi-select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LoadingSwap } from "@/components/ui/loading-swap";

const COMMON_REQUIREMENTS = [
  "First Aid",
  "CPR",
  "BLS",
  "Vulnerable Sector Check",
  "TB Test",
  "Immunization Record",
  "2+ Years Experience",
];

const step1Defaults: StaffRequestWizardStep1Values = {
  profession: "" as ProfessionalRole,
  startDate: undefined as unknown as Date,
  endDate: null,
  startTime: "09:00",
  endTime: "17:00",
  requirements: [],
  tasks: [],
  positions: 1,
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function StaffRequestWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [schedule, setSchedule] = useState<StaffRequestWizardStep1Values | null>(
    null,
  );
  const [jobId, setJobId] = useState<string | null>(null);
  const [tiers, setTiers] = useState<StaffMatchTier[] | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [ringCellCount, setRingCellCount] = useState(0);
  const [candidateCount, setCandidateCount] = useState(0);
  const [currency, setCurrency] = useState("CAD");
  const [selectedTierId, setSelectedTierId] = useState<StaffMatchTierId | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const step1Form = useForm<StaffRequestWizardStep1Values>({
    resolver: zodResolver(
      staffRequestWizardStep1Schema,
    ) as Resolver<StaffRequestWizardStep1Values>,
    defaultValues: step1Defaults,
  });

  const confirmForm = useForm<StaffRequestWizardConfirmValues>({
    resolver: zodResolver(
      staffRequestWizardConfirmSchema,
    ) as Resolver<StaffRequestWizardConfirmValues>,
    defaultValues: {
      notes: "",
      acceptedHourlyRate: 18,
    },
  });

  const { register: registerConfirm } = confirmForm;

  async function handleStep1Continue(values: StaffRequestWizardStep1Values) {
    setSchedule(values);
    setMatchLoading(true);
    setTiers(null);
    setSelectedTierId(null);
    setJobId(null);

    const res = await createStaffRequestAndMatchAction({
      ...values,
      notes: "",
    });

    setMatchLoading(false);

    if (res.error) {
      toast.error(res.message);
      return;
    }

    console.log(res);

    setJobId(res.data.jobId);
    setTiers(res.data.tiers);
    setRingCellCount(res.data.ringCellCount);
    setCandidateCount(res.data.candidateCount);
    setCurrency(res.data.currency);
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
    setTiers(null);
    setSelectedTierId(null);
    setStep(1);
  }

  function handleContinueToConfirm() {
    if (!selectedTierId || !tiers) return;
    const tier = tiers.find((t) => t.tierId === selectedTierId);
    if (!tier) return;
    confirmForm.setValue("acceptedHourlyRate", tier.hourlyRate);
    setStep(3);
  }

  async function handleFinalSubmit(values: StaffRequestWizardConfirmValues) {
    if (!jobId) return;

    const result = await finalizeStaffRequestMatchAction({
      jobId,
      hourlyRate: values.acceptedHourlyRate,
      notes: values.notes ?? "",
    });
    if (result && "error" in result && result.error) {
      toast.error(result.message ?? "Could not finalize request");
    }
  }

  const requirements = step1Form.watch("requirements");
  const tasks = step1Form.watch("tasks");
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const positionLabel =
    schedule && schedule.positions === 1 ? "1 position" : `${schedule?.positions ?? 1} positions`;

  const selectedTier =
    tiers && selectedTierId
      ? tiers.find((t) => t.tierId === selectedTierId)
      : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className={cn(step >= 1 && "font-medium text-foreground")}>1 When</span>
        <span aria-hidden>·</span>
        <span className={cn(step >= 2 && "font-medium text-foreground")}>2 Pick tier</span>
        <span aria-hidden>·</span>
        <span className={cn(step >= 3 && "font-medium text-foreground")}>3 Confirm</span>
      </div>

      <div className={cn(step !== 1 && "hidden")} aria-hidden={step !== 1}>
        <form
          className="space-y-6"
          onSubmit={step1Form.handleSubmit((v) => void handleStep1Continue(v))}
        >
          <FieldGroup>
            <Field data-invalid={!!step1Form.formState.errors.profession}>
              <FieldLabel>Profession</FieldLabel>
              <FieldDescription>Who do you need on shift?</FieldDescription>
              <MultiSelect
                single
                values={
                  step1Form.watch("profession")
                    ? [step1Form.watch("profession")]
                    : []
                }
                onValuesChange={(v) =>
                  step1Form.setValue("profession", (v[0] ?? "") as ProfessionalRole, {
                    shouldValidate: true,
                  })
                }
              >
                <MultiSelectTrigger className="w-full">
                  <MultiSelectValue placeholder="Select profession..." />
                </MultiSelectTrigger>
                <MultiSelectContent search={{ placeholder: "Search profession..." }}>
                  <MultiSelectGroup>
                    {(PROFESSIONAL_ROLES as ProfessionalRole[]).map((role) => (
                      <MultiSelectItem key={role} value={role}>
                        {role}
                      </MultiSelectItem>
                    ))}
                  </MultiSelectGroup>
                </MultiSelectContent>
              </MultiSelect>
              <FieldError>{step1Form.formState.errors.profession?.message}</FieldError>
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
                        !step1Form.watch("startDate") && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {step1Form.watch("startDate")
                        ? format(step1Form.watch("startDate"), "PPP")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={step1Form.watch("startDate")}
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
                <FieldLabel>End date (optional)</FieldLabel>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !step1Form.watch("endDate") && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {step1Form.watch("endDate")
                        ? format(step1Form.watch("endDate")!, "PPP")
                        : "Same day"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={step1Form.watch("endDate") ?? undefined}
                      onSelect={(d) => {
                        step1Form.setValue("endDate", d ?? null, {
                          shouldValidate: true,
                        });
                        setEndDateOpen(false);
                      }}
                      disabled={(d) => {
                        const start = step1Form.watch("startDate");
                        if (!start) return true;
                        return d < start;
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <FieldError>{step1Form.formState.errors.endDate?.message}</FieldError>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!step1Form.formState.errors.startTime}>
                <FieldLabel htmlFor="wiz-start-time">Start time</FieldLabel>
                <Input
                  id="wiz-start-time"
                  type="time"
                  {...step1Form.register("startTime")}
                />
                <FieldError>{step1Form.formState.errors.startTime?.message}</FieldError>
              </Field>
              <Field data-invalid={!!step1Form.formState.errors.endTime}>
                <FieldLabel htmlFor="wiz-end-time">End time</FieldLabel>
                <Input
                  id="wiz-end-time"
                  type="time"
                  {...step1Form.register("endTime")}
                />
                <FieldError>{step1Form.formState.errors.endTime?.message}</FieldError>
              </Field>
            </div>

            <div className="rounded-xl border border-border">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium transition-colors"
                aria-expanded={advancedOpen}
                onClick={() => setAdvancedOpen((o) => !o)}
              >
                Advanced
                {advancedOpen ? (
                  <ChevronUp className="size-4 shrink-0 opacity-70" />
                ) : (
                  <ChevronDown className="size-4 shrink-0 opacity-70" />
                )}
              </button>
              {advancedOpen ? (
                <div className="space-y-4 border-t border-border px-4 py-4">
                  <Field>
                    <FieldLabel>Requirements</FieldLabel>
                    <FieldDescription>Optional credentials and checks.</FieldDescription>
                    <MultiSelect
                      values={requirements}
                      onValuesChange={(v) =>
                        step1Form.setValue("requirements", v, { shouldValidate: true })
                      }
                    >
                      <MultiSelectTrigger className="w-full">
                        <MultiSelectValue placeholder="Select requirements..." />
                      </MultiSelectTrigger>
                      <MultiSelectContent search={{ placeholder: "Search requirements..." }}>
                        <MultiSelectGroup>
                          {COMMON_REQUIREMENTS.map((r) => (
                            <MultiSelectItem key={r} value={r}>
                              {r}
                            </MultiSelectItem>
                          ))}
                        </MultiSelectGroup>
                      </MultiSelectContent>
                    </MultiSelect>
                  </Field>

                  <Field>
                    <FieldLabel>Tasks</FieldLabel>
                    <FieldDescription>Tasks required on shift.</FieldDescription>
                    <MultiSelect
                      values={tasks}
                      onValuesChange={(v) =>
                        step1Form.setValue("tasks", v, { shouldValidate: true })
                      }
                    >
                      <MultiSelectTrigger className="w-full">
                        <MultiSelectValue placeholder="Select tasks..." />
                      </MultiSelectTrigger>
                      <MultiSelectContent search={{ placeholder: "Search tasks..." }}>
                        <MultiSelectGroup>
                          {JOB_TASKS.map((task) => (
                            <MultiSelectItem key={task} value={task}>
                              {task}
                            </MultiSelectItem>
                          ))}
                        </MultiSelectGroup>
                      </MultiSelectContent>
                    </MultiSelect>
                  </Field>

                  <Field data-invalid={!!step1Form.formState.errors.positions}>
                    <FieldLabel htmlFor="wiz-positions">Positions</FieldLabel>
                    <FieldDescription>How many workers for this request.</FieldDescription>
                    <Input
                      id="wiz-positions"
                      type="number"
                      min={1}
                      {...step1Form.register("positions", { valueAsNumber: true })}
                    />
                    <FieldError>{step1Form.formState.errors.positions?.message}</FieldError>
                  </Field>
                </div>
              ) : null}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full sm:w-auto"
              disabled={step1Form.formState.isSubmitting || matchLoading}
            >
              <LoadingSwap
                isLoading={step1Form.formState.isSubmitting || matchLoading}
              >
                <span className="inline-flex items-center gap-2">
                  Send request and match staff
                  <MapPin className="size-4 opacity-80" />
                </span>
              </LoadingSwap>
            </Button>
          </FieldGroup>
        </form>
      </div>

      {step === 2 ? (
        <div className="space-y-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 gap-1 text-muted-foreground"
            onClick={() => void handleBackFromTierStep()}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>

          {matchLoading || !tiers ? (
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-16 text-center"
              aria-live="polite"
            >
              <Loader2 className="text-muted-foreground size-8 animate-spin" />
              <p className="text-muted-foreground text-sm">
                Saving your request and scanning nearby cells for staff…
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Sparkles className="size-4 shrink-0" />
                  Scanned {ringCellCount} H3 cells (k=2 ring).{" "}
                  {candidateCount === 0
                    ? "No workers matched your filters in range — pick a tier for baseline pricing."
                    : `${candidateCount} worker${candidateCount === 1 ? "" : "s"} matched.`}
                </p>
                <p className="text-foreground text-lg font-semibold tracking-tight">
                  Choose your crew tier
                </p>
                <p className="text-muted-foreground text-sm">
                  Each tier maps to a different experience band and hourly rate.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {tiers.map((tier) => {
                  const selected = selectedTierId === tier.tierId;
                  return (
                    <button
                      key={tier.tierId}
                      type="button"
                      onClick={() => setSelectedTierId(tier.tierId)}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition-all outline-none",
                        "hover:border-foreground/20 focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        selected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                          : "border-border bg-card",
                      )}
                    >
                      <p className="text-primary text-xs font-semibold tracking-wide uppercase">
                        {tier.tierId === "summit"
                          ? "Premium"
                          : tier.tierId === "harbor"
                            ? "Standard"
                            : "Value"}
                      </p>
                      <p className="mt-1 font-semibold">{tier.name}</p>
                      <p className="text-muted-foreground mt-1 text-xs leading-snug">
                        {tier.tagline}
                      </p>
                      <div className="mt-4 border-t border-border pt-3">
                        {tier.worker ? (
                          <p className="text-sm font-medium">{tier.worker.displayName}</p>
                        ) : (
                          <p className="text-muted-foreground text-sm italic">
                            No named match in this band — tier rate still applies.
                          </p>
                        )}
                        {tier.worker ? (
                          <p className="text-muted-foreground text-xs">
                            {tier.worker.yearsExp} yrs experience
                          </p>
                        ) : null}
                      </div>
                      <p className="mt-3 text-2xl font-semibold tabular-nums">
                        {formatMoney(tier.hourlyRate * 100, currency)}
                        <span className="text-muted-foreground text-sm font-normal">/hr</span>
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Est. {formatMoney(tier.estimatedTotalCents, currency)} total
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  size="lg"
                  disabled={!selectedTierId}
                  onClick={handleContinueToConfirm}
                >
                  Continue
                </Button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {step === 3 && schedule && selectedTier && jobId ? (
        <form
          className="space-y-6"
          onSubmit={confirmForm.handleSubmit((v: StaffRequestWizardConfirmValues) =>
            void handleFinalSubmit(v),
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 gap-1 text-muted-foreground"
            onClick={() => setStep(2)}
          >
            <ArrowLeft className="size-4" />
            Back to tiers
          </Button>

          <div className="rounded-2xl border bg-muted/30 p-4 text-sm">
            <p className="font-medium text-foreground">Your selection</p>
            <ul className="text-muted-foreground mt-2 space-y-1">
              <li className="text-foreground font-medium">{selectedTier.name}</li>
              <li>{schedule.profession}</li>
              <li>
                {format(schedule.startDate, "PPP")}
                {schedule.endDate ? ` – ${format(schedule.endDate, "PPP")}` : ""}
              </li>
              <li>
                {schedule.startTime} – {schedule.endTime}
              </li>
              <li className="capitalize">{positionLabel}</li>
              {selectedTier.worker ? (
                <li>Suggested: {selectedTier.worker.displayName}</li>
              ) : null}
            </ul>
          </div>

          <FieldGroup>
            <Field data-invalid={!!confirmForm.formState.errors.acceptedHourlyRate}>
              <FieldLabel htmlFor="wiz-rate">Hourly rate ($)</FieldLabel>
              <FieldDescription>
                Pulled from your tier; adjust if needed (minimum $15/hr).
              </FieldDescription>
              <Input
                id="wiz-rate"
                type="number"
                step="0.01"
                min={15}
                {...registerConfirm("acceptedHourlyRate", { valueAsNumber: true })}
              />
              <FieldError>
                {confirmForm.formState.errors.acceptedHourlyRate?.message}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="wiz-notes">Notes</FieldLabel>
              <FieldDescription>Optional context for your request.</FieldDescription>
              <textarea
                id="wiz-notes"
                rows={3}
                placeholder="Unit, special instructions…"
                className="w-full min-w-0 resize-y rounded-lg border border-input bg-input/30 px-3 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
                {...registerConfirm("notes")}
              />
            </Field>

            <Button
              type="submit"
              size="lg"
              className="w-full sm:w-auto"
              disabled={confirmForm.formState.isSubmitting}
            >
              <LoadingSwap isLoading={confirmForm.formState.isSubmitting}>
                <span>Finalize request</span>
              </LoadingSwap>
            </Button>
          </FieldGroup>
        </form>
      ) : null}
    </div>
  );
}
