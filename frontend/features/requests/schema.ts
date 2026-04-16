import { format } from "date-fns";
import { z } from "zod";
import type { Database } from "@/services/supabase/types/database";
import { calendarDayStrings } from "./lib/calendar-day-strings";
import { DEFAULT_SAME_DAY_LEAD_HOURS } from "@/lib/quarter-hour-times";
import { parseStaffRequestDailyWindows } from "./lib/parse-staff-request-daily-windows";
import { isStartDateTimeAtLeastLeadHoursFromNow } from "./lib/schedule-time-bounds";

const staffRequestFields = {
  startDate: z.date({ error: "Start date is required" }),
  endDate: z.date().optional().nullable(),
  startTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time (use HH:mm)"),
  endTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time (use HH:mm)"),
  requirements: z.array(z.string().min(1)).default([]),
  tasks: z.array(z.string().min(1)).default([]),
  positions: z.coerce.number().int().min(1, "At least 1 position required"),
  notes: z.string().optional(),
};

/** Minimum wage floor for validation — hourly rate is unset in DB until pricing is accepted */
const MIN_HOURLY = 15;

/** One time range within a calendar day (can add several per day, like availability). */
function isQuarterHourHhmm(t: string): boolean {
  const parts = t.split(":");
  if (parts.length < 2) return false;
  const m = Number(parts[1]);
  return Number.isFinite(m) && [0, 15, 30, 45].includes(m);
}

/** End may be a quarter hour or `23:59` when the start is `23:45`. */
function isValidSlotEndHhmm(t: string): boolean {
  return isQuarterHourHhmm(t) || t === "23:59";
}

export const staffRequestTimeSlotSchema = z
  .object({
    startTime: staffRequestFields.startTime,
    endTime: staffRequestFields.endTime,
  })
  .superRefine((slot, ctx) => {
    if (!isQuarterHourHhmm(slot.startTime)) {
      ctx.addIssue({
        code: "custom",
        message: "Use 15-minute times (e.g. 9:00, 9:15).",
        path: ["startTime"],
      });
    }
    if (!isValidSlotEndHhmm(slot.endTime)) {
      ctx.addIssue({
        code: "custom",
        message: "Use 15-minute times (e.g. 5:00, 5:15), or 11:59 PM to end the day.",
        path: ["endTime"],
      });
    }
    const [sh, sm] = slot.startTime.split(":").map(Number);
    const [eh, em] = slot.endTime.split(":").map(Number);
    if (eh * 60 + em <= sh * 60 + sm) {
      ctx.addIssue({
        code: "custom",
        message: "End time must be after start time",
        path: ["endTime"],
      });
    }
  });

export type StaffRequestTimeSlot = z.infer<typeof staffRequestTimeSlotSchema>;

/** One calendar day with one or more shift segments (local dates). */
export const staffRequestDayWindowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  slots: z
    .array(staffRequestTimeSlotSchema)
    .min(1, "Add at least one time range for each day"),
});

export type StaffRequestDayWindow = z.infer<typeof staffRequestDayWindowSchema>;

/** Schedule-only step (wizard / preview): per-day start/end times. */
export const staffRequestScheduleSchema = z
  .object({
    startDate: staffRequestFields.startDate,
    endDate: staffRequestFields.endDate,
    positions: staffRequestFields.positions.default(1),
    dailyWindows: z
      .array(staffRequestDayWindowSchema)
      .min(1, "Choose dates and set shift times for each day"),
  })
  .refine(
    (data) => {
      if (!data.endDate) return true;
      return data.endDate >= data.startDate;
    },
    { message: "End date must be on or after start date", path: ["endDate"] },
  )
  .superRefine((data, ctx) => {
    const expected = calendarDayStrings(data.startDate, data.endDate);
    const dayKeys = data.dailyWindows.map((w) => w.date);
    if (new Set(dayKeys).size !== dayKeys.length) {
      ctx.addIssue({
        code: "custom",
        message: "Each calendar date must appear only once.",
        path: ["dailyWindows"],
      });
    }
    const byDate = new Map(data.dailyWindows.map((w) => [w.date, w]));
    for (const d of expected) {
      if (!byDate.has(d)) {
        ctx.addIssue({
          code: "custom",
          message: `Set start and end time for ${d}`,
          path: ["dailyWindows"],
        });
      }
    }
    for (const w of data.dailyWindows) {
      if (!expected.includes(w.date)) {
        ctx.addIssue({
          code: "custom",
          message: `Remove or update times for ${w.date} (outside selected range)`,
          path: ["dailyWindows"],
        });
      }
    }
    const startYmd = format(data.startDate, "yyyy-MM-dd");
    const first = byDate.get(startYmd);
    const firstStart = first?.slots[0]?.startTime;
    if (
      firstStart &&
      !isStartDateTimeAtLeastLeadHoursFromNow(data.startDate, firstStart)
    ) {
      ctx.addIssue({
        code: "custom",
        message: `Start time must be at least ${DEFAULT_SAME_DAY_LEAD_HOURS} hours from now.`,
        path: ["dailyWindows"],
      });
    }
  });

export type StaffRequestScheduleValues = z.infer<typeof staffRequestScheduleSchema>;

/** Wizard step 1: schedule (incl. positions) + optional advanced fields. */
export const staffRequestWizardStep1Schema = staffRequestScheduleSchema.and(
  z.object({
    requirements: z.array(z.string().min(1)).default([]),
    tasks: z.array(z.string().min(1)).default([]),
  }),
);

export type StaffRequestWizardStep1Values = z.infer<
  typeof staffRequestWizardStep1Schema
>;

const dateFromClient = z.union([
  z.date(),
  z.string().transform((s) => new Date(s)),
]);

/** Payload from the wizard preview step (ISO date strings from JSON). */
export const staffRequestPricingPreviewPayloadSchema = z
  .object({
    startDate: dateFromClient,
    endDate: dateFromClient.nullable().optional(),
    positions: z.coerce.number().int().min(1).optional().default(1),
    dailyWindows: z.array(staffRequestDayWindowSchema).min(1),
  })
  .refine(
    (data) => {
      if (!data.endDate) return true;
      return data.endDate >= data.startDate;
    },
    { message: "End date must be on or after start date", path: ["endDate"] },
  )
  .superRefine((data, ctx) => {
    const start =
      data.startDate instanceof Date ? data.startDate : new Date(data.startDate);
    const end = data.endDate
      ? data.endDate instanceof Date
        ? data.endDate
        : new Date(data.endDate)
      : null;
    const expected = calendarDayStrings(start, end);
    const dayKeys = data.dailyWindows.map((w) => w.date);
    if (new Set(dayKeys).size !== dayKeys.length) {
      ctx.addIssue({
        code: "custom",
        message: "Each calendar date must appear only once.",
        path: ["dailyWindows"],
      });
    }
    const byDate = new Map(data.dailyWindows.map((w) => [w.date, w]));
    for (const d of expected) {
      if (!byDate.has(d)) {
        ctx.addIssue({
          code: "custom",
          message: `Missing shift times for ${d}`,
          path: ["dailyWindows"],
        });
      }
    }
    for (const w of data.dailyWindows) {
      if (!expected.includes(w.date)) {
        ctx.addIssue({
          code: "custom",
          message: `Unexpected date ${w.date}`,
          path: ["dailyWindows"],
        });
      }
    }
    const startYmd = format(start, "yyyy-MM-dd");
    const first = byDate.get(startYmd);
    const firstStart = first?.slots[0]?.startTime;
    if (firstStart && !isStartDateTimeAtLeastLeadHoursFromNow(start, firstStart)) {
      ctx.addIssue({
        code: "custom",
        message: `Start time must be at least ${DEFAULT_SAME_DAY_LEAD_HOURS} hours from now.`,
        path: ["dailyWindows"],
      });
    }
  });

export type StaffRequestPricingPreviewPayload = z.infer<
  typeof staffRequestPricingPreviewPayloadSchema
>;

/** New staff request (step 1) — hourly rate is set after pricing is accepted */
export const staffRequestCreateSchema = z
  .object(staffRequestFields)
  .refine(
    (data) => {
      if (!data.endDate) return true;
      return data.endDate >= data.startDate;
    },
    { message: "End date must be on or after start date", path: ["endDate"] },
  )
  .refine(
    (data) => {
      const [startH, startM] = data.startTime.split(":").map(Number);
      const [endH, endM] = data.endTime.split(":").map(Number);
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;
      return endMins > startMins;
    },
    { message: "End time must be after start time", path: ["endTime"] },
  )
  .refine(
    (data) =>
      isStartDateTimeAtLeastLeadHoursFromNow(data.startDate, data.startTime),
    {
      message: `Start time must be at least ${DEFAULT_SAME_DAY_LEAD_HOURS} hours from now.`,
      path: ["startTime"],
    },
  )
  .refine(
    (data) => isQuarterHourHhmm(data.startTime) && isValidSlotEndHhmm(data.endTime),
    {
      message: "Use 15-minute times (e.g. 9:00, 9:15).",
      path: ["startTime"],
    },
  );

export type StaffRequestCreateValues = z.infer<typeof staffRequestCreateSchema>;

/** Wizard final step: optional notes (hourly rate comes from selected pricing tier). */
export const staffRequestWizardConfirmSchema = z.object({
  notes: z.string().optional(),
});

export type StaffRequestWizardConfirmValues = z.infer<
  typeof staffRequestWizardConfirmSchema
>;

/** Full form including hourly rate (editing an existing request) */
export const jobFormSchema = z
  .object({
    ...staffRequestFields,
    hourlyRate: z.coerce
      .number({ error: "Enter an hourly rate" })
      .min(MIN_HOURLY, "Hourly rate must be above minimum wage"),
  })
  .refine(
    (data) => {
      if (!data.endDate) return true;
      return data.endDate >= data.startDate;
    },
    { message: "End date must be on or after start date", path: ["endDate"] },
  )
  .refine(
    (data) => {
      const [startH, startM] = data.startTime.split(":").map(Number);
      const [endH, endM] = data.endTime.split(":").map(Number);
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;
      return endMins > startMins;
    },
    { message: "End time must be after start time", path: ["endTime"] },
  )
  .refine(
    (data) =>
      isStartDateTimeAtLeastLeadHoursFromNow(data.startDate, data.startTime),
    {
      message: `Start time must be at least ${DEFAULT_SAME_DAY_LEAD_HOURS} hours from now.`,
      path: ["startTime"],
    },
  )
  .refine(
    (data) => isQuarterHourHhmm(data.startTime) && isValidSlotEndHhmm(data.endTime),
    {
      message: "Use 15-minute times (e.g. 9:00, 9:15).",
      path: ["startTime"],
    },
  );

export type StaffRequestFormValues = z.infer<typeof staffRequestCreateSchema>;

type StaffRequestRow = Database["public"]["Tables"]["staff_requests"]["Row"];

export type StaffRequestFormInput = Pick<
  StaffRequestRow,
  | "id"
  | "start_date"
  | "end_date"
  | "daily_time_windows"
  | "requirements"
  | "tasks"
  | "pricing_rate"
  | "positions"
  | "notes"
>;

/** Normalize DB time (e.g. "09:00:00") to HH:mm for HTML time inputs */
function normalizeTimeForInput(time: string | null | undefined, fallback: string): string {
  if (!time || typeof time !== "string") return fallback;
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  const h = String(parseInt(match[1], 10)).padStart(2, "0");
  const m = String(parseInt(match[2], 10)).padStart(2, "0");
  return `${h}:${m}`;
}

export function mapStaffRequestToFormValues(row: StaffRequestFormInput): StaffRequestFormValues {
  const plans = parseStaffRequestDailyWindows(row.daily_time_windows);
  const startYmd = format(new Date(row.start_date), "yyyy-MM-dd");
  const plan = plans.find((p) => p.date === startYmd) ?? plans[0];
  const slot0 = plan?.slots[0];
  return {
    startDate: new Date(row.start_date),
    endDate: row.end_date ? new Date(row.end_date) : null,
    startTime: normalizeTimeForInput(slot0?.startTime, "09:00"),
    endTime: normalizeTimeForInput(slot0?.endTime, "17:00"),
    requirements: row.requirements ?? [],
    tasks: row.tasks ?? [],
    positions: row.positions,
    notes: row.notes ?? "",
  };
}
