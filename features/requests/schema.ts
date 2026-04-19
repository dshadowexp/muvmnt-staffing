import { format } from "date-fns";
import { z } from "zod";
import { calendarDayStrings } from "./lib/calendar-day-strings";
import { DEFAULT_SAME_DAY_LEAD_HOURS } from "@/lib/quarter-hour-times";
import { isStartDateTimeAtLeastLeadHoursFromNow } from "./lib/schedule-time-bounds";

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

/** Keys under `staffRequest.validation` (next-intl) or English fallbacks when `t` is omitted. */
export type StaffRequestScheduleValidationKey =
  | "startDateRequired"
  | "invalidTimeFormat"
  | "quarterStart"
  | "quarterEnd"
  | "endAfterStart"
  | "invalidDayDate"
  | "daySlotsMin"
  | "positionsMin"
  | "dailyWindowsMin"
  | "endDateAfterStart"
  | "eachDateOnce"
  | "setTimesForDay"
  | "outsideSelectedRange"
  | "startTimeLeadHours";

const STAFF_REQUEST_SCHEDULE_MSG_FALLBACK: Record<
  StaffRequestScheduleValidationKey,
  string
> = {
  startDateRequired: "Start date is required",
  invalidTimeFormat: "Invalid time (use HH:mm)",
  quarterStart: "Use 15-minute times (e.g. 9:00, 9:15).",
  quarterEnd:
    "Use 15-minute times (e.g. 5:00, 5:15), or 11:59 PM to end the day.",
  endAfterStart: "End time must be after start time",
  invalidDayDate: "Invalid date",
  daySlotsMin: "Add at least one time range for each day",
  positionsMin: "At least 1 position required",
  dailyWindowsMin: "Choose dates and set shift times for each day",
  endDateAfterStart: "End date must be on or after start date",
  eachDateOnce: "Each calendar date must appear only once.",
  setTimesForDay: "Set start and end time for {date}",
  outsideSelectedRange:
    "Remove or update times for {date} (outside selected range)",
  startTimeLeadHours:
    "Start time must be at least {hours} hours from now.",
};

function staffRequestScheduleMsg(
  t:
    | ((
        key: StaffRequestScheduleValidationKey,
        values?: Record<string, string | number>,
      ) => string)
    | undefined,
  key: StaffRequestScheduleValidationKey,
  values?: Record<string, string | number>,
): string {
  if (t) return t(key, values);
  let s = STAFF_REQUEST_SCHEDULE_MSG_FALLBACK[key];
  if (values) {
    for (const [k, v] of Object.entries(values)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

/** Localized schedule schema for the staff request wizard; server uses default (English). */
export function buildStaffRequestScheduleSchema(
  t?: (
    key: StaffRequestScheduleValidationKey,
    values?: Record<string, string | number>,
  ) => string,
) {
  const msg = (key: StaffRequestScheduleValidationKey, values?: Record<string, string | number>) =>
    staffRequestScheduleMsg(t, key, values);

  const staffRequestFields = {
    startDate: z.date({ error: msg("startDateRequired") }),
    endDate: z.date().optional().nullable(),
    startTime: z
      .string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, msg("invalidTimeFormat")),
    endTime: z
      .string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, msg("invalidTimeFormat")),
    requirements: z.array(z.string().min(1)).default([]),
    tasks: z.array(z.string().min(1)).default([]),
    positions: z.coerce.number().int().min(1, msg("positionsMin")),
    notes: z.string().optional(),
  };

  const staffRequestTimeSlotSchema = z
    .object({
      startTime: staffRequestFields.startTime,
      endTime: staffRequestFields.endTime,
    })
    .superRefine((slot, ctx) => {
      if (!isQuarterHourHhmm(slot.startTime)) {
        ctx.addIssue({
          code: "custom",
          message: msg("quarterStart"),
          path: ["startTime"],
        });
      }
      if (!isValidSlotEndHhmm(slot.endTime)) {
        ctx.addIssue({
          code: "custom",
          message: msg("quarterEnd"),
          path: ["endTime"],
        });
      }
      const [sh, sm] = slot.startTime.split(":").map(Number);
      const [eh, em] = slot.endTime.split(":").map(Number);
      if (eh * 60 + em <= sh * 60 + sm) {
        ctx.addIssue({
          code: "custom",
          message: msg("endAfterStart"),
          path: ["endTime"],
        });
      }
    });

  const staffRequestDayWindowSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, msg("invalidDayDate")),
    slots: z.array(staffRequestTimeSlotSchema).min(1, msg("daySlotsMin")),
  });

  const staffRequestScheduleSchema = z
    .object({
      startDate: staffRequestFields.startDate,
      endDate: staffRequestFields.endDate,
      positions: staffRequestFields.positions.default(1),
      dailyWindows: z
        .array(staffRequestDayWindowSchema)
        .min(1, msg("dailyWindowsMin")),
    })
    .refine(
      (data) => {
        if (!data.endDate) return true;
        return data.endDate >= data.startDate;
      },
      { message: msg("endDateAfterStart"), path: ["endDate"] },
    )
    .superRefine((data, ctx) => {
      const expected = calendarDayStrings(data.startDate, data.endDate);
      const dayKeys = data.dailyWindows.map((w) => w.date);
      if (new Set(dayKeys).size !== dayKeys.length) {
        ctx.addIssue({
          code: "custom",
          message: msg("eachDateOnce"),
          path: ["dailyWindows"],
        });
      }
      const byDate = new Map(data.dailyWindows.map((w) => [w.date, w]));
      for (const d of expected) {
        if (!byDate.has(d)) {
          ctx.addIssue({
            code: "custom",
            message: msg("setTimesForDay", { date: d }),
            path: ["dailyWindows"],
          });
        }
      }
      for (const w of data.dailyWindows) {
        if (!expected.includes(w.date)) {
          ctx.addIssue({
            code: "custom",
            message: msg("outsideSelectedRange", { date: w.date }),
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
          message: msg("startTimeLeadHours", {
            hours: DEFAULT_SAME_DAY_LEAD_HOURS,
          }),
          path: ["dailyWindows"],
        });
      }
    });

  return {
    staffRequestTimeSlotSchema,
    staffRequestDayWindowSchema,
    staffRequestScheduleSchema,
  };
}

const _defaultScheduleParts = buildStaffRequestScheduleSchema();

export const staffRequestTimeSlotSchema =
  _defaultScheduleParts.staffRequestTimeSlotSchema;

export type StaffRequestTimeSlot = z.infer<typeof staffRequestTimeSlotSchema>;

export const staffRequestDayWindowSchema =
  _defaultScheduleParts.staffRequestDayWindowSchema;

export type StaffRequestDayWindow = z.infer<typeof staffRequestDayWindowSchema>;

/** Schedule-only step (wizard / preview): per-day start/end times. */
export const staffRequestScheduleSchema =
  _defaultScheduleParts.staffRequestScheduleSchema;

export type StaffRequestScheduleValues = z.infer<typeof staffRequestScheduleSchema>;
