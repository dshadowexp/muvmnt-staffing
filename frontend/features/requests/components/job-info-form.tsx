"use client";

import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { JOB_TASKS } from "@/lib/constants";
import {
  jobFormSchema,
  staffRequestCreateSchema,
  type StaffRequestFormValues,
  type StaffRequestCreateValues,
} from "../schema";
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
import { createJobInfoAction, updateJobInfoAction } from "../actions";
import { type StaffRequestFormInput, mapStaffRequestToFormValues } from "../schema";

const COMMON_REQUIREMENTS = [
  "First Aid",
  "CPR",
  "BLS",
  "Vulnerable Sector Check",
  "TB Test",
  "Immunization Record",
  "2+ Years Experience",
];

const defaultCreateValues = {
  startDate: undefined as unknown as Date,
  endDate: null,
  startTime: "09:00",
  endTime: "17:00",
  requirements: [] as string[],
  tasks: [] as string[],
  positions: 1,
  notes: "",
} as const satisfies StaffRequestCreateValues;

export function JobInfoForm({ jobInfo }: { jobInfo?: StaffRequestFormInput }) {
  const isEdit = Boolean(jobInfo);

  const form = useForm<StaffRequestFormValues | StaffRequestCreateValues>({
    defaultValues: jobInfo ? mapStaffRequestToFormValues({ ...jobInfo }) : defaultCreateValues,
    resolver: zodResolver(
      isEdit ? jobFormSchema : staffRequestCreateSchema,
    ) as Resolver<StaffRequestFormValues | StaffRequestCreateValues>,
  });

  const { register, setValue, watch, reset, formState: { errors } } = form;

  useEffect(() => {
    if (jobInfo) {
      reset(mapStaffRequestToFormValues({ ...jobInfo }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobInfo?.id]);

  const requirements = watch("requirements");
  const tasks = watch("tasks");
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  async function handleSubmit(
    data: StaffRequestFormValues | StaffRequestCreateValues,
  ) {
    if (isEdit && jobInfo) {
      const result = await updateJobInfoAction(jobInfo.id, data);
      if (result?.error) {
        toast.error(result.message);
      }
      return;
    }
    const result = await createJobInfoAction(data);
    if (result?.error) {
      toast.error(result.message);
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="space-y-6"
    >
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.startDate}>
            <FieldLabel htmlFor="start-date">Start date</FieldLabel>
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="start-date"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !form.watch("startDate") && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {form.watch("startDate")
                    ? format(form.watch("startDate"), "PPP")
                    : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.watch("startDate")}
                  onSelect={(d) => {
                    if (d) setValue("startDate", d, { shouldValidate: true });
                    setStartDateOpen(false);
                  }}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </PopoverContent>
            </Popover>
            <FieldError>{errors.startDate?.message}</FieldError>
          </Field>

          <Field data-invalid={!!errors.endDate}>
            <FieldLabel htmlFor="end-date">End date (optional)</FieldLabel>
            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="end-date"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !form.watch("endDate") && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {form.watch("endDate")
                    ? format(form.watch("endDate")!, "PPP")
                    : "Pick a date (optional)"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.watch("endDate") ?? undefined}
                  onSelect={(d) => {
                    setValue("endDate", d ?? null, { shouldValidate: true });
                    setEndDateOpen(false);
                  }}
                  disabled={(d) => {
                    const start = form.watch("startDate");
                    if (!start) return true;
                    return d < start;
                  }}
                />
              </PopoverContent>
            </Popover>
            <FieldError>{errors.endDate?.message}</FieldError>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.startTime}>
            <FieldLabel htmlFor="job-start-time">Job start time</FieldLabel>
            <Input
              id="job-start-time"
              type="time"
              {...register("startTime")}
            />
            <FieldError>{errors.startTime?.message}</FieldError>
          </Field>
          <Field data-invalid={!!errors.endTime}>
            <FieldLabel htmlFor="job-end-time">Job end time</FieldLabel>
            <Input
              id="job-end-time"
              type="time"
              {...register("endTime")}
            />
            <FieldError>{errors.endTime?.message}</FieldError>
          </Field>
        </div>

        <Field>
          <FieldLabel>Requirements</FieldLabel>
          <FieldDescription>
            Select requirements. Search or pick from the list.
          </FieldDescription>
          <MultiSelect
            values={requirements}
            onValuesChange={(v) =>
              setValue("requirements", v, { shouldValidate: true })
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
          <FieldDescription>Select tasks required for this shift.</FieldDescription>
          <MultiSelect
            values={tasks}
            onValuesChange={(v) => setValue("tasks", v, { shouldValidate: true })}
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

        <Field data-invalid={!!errors.positions}>
          <FieldLabel htmlFor="positions">Positions</FieldLabel>
          <FieldDescription>Number of workers needed for this shift</FieldDescription>
          <Input
            id="positions"
            type="number"
            min={1}
            {...register("positions")}
          />
          <FieldError>{errors.positions?.message}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="notes">Notes</FieldLabel>
          <FieldDescription>Extra details about the shift</FieldDescription>
          <textarea
            id="notes"
            rows={4}
            placeholder="e.g. specific unit, special instructions..."
            className="w-full min-w-0 resize-y rounded-lg border border-input bg-input/30 px-3 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            {...register("notes")}
          />
        </Field>

        <Button
          type="submit"
          size="lg"
          disabled={form.formState.isSubmitting}
        >
          <LoadingSwap isLoading={form.formState.isSubmitting}>
            <span>{isEdit ? "Save changes" : "Submit staff request"}</span>
          </LoadingSwap>
        </Button>
      </FieldGroup>
    </form>
  );
}
