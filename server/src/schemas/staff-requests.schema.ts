import { z } from 'zod';
import { enumerateCalendarDays } from '../services/staff-requests/calendar-days';

/**
 * Staff-request HTTP schemas.
 *
 * **Create-and-match body** — shift coverage is only described by `dailyWindows`:
 * one entry per calendar day in the selected range, each with one or more `slots`
 * `{ startTime, endTime }`. There is no request-level single start/end for the job.
 *
 * **Create-and-match reply** — `assignments[].startTime` / `endTime` are the
 * matched worker’s coverage segment on that day (API output), not the client’s
 * requested window shape.
 */

// ─── Shared ───────────────────────────────────────────────────────────────────

const timeHm = z
  .string()
  .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time — use HH:mm');

function isQuarterHourHhmm(t: string): boolean {
  const parts = t.split(':');
  if (parts.length < 2) return false;
  const m = Number(parts[1]);
  return Number.isFinite(m) && [0, 15, 30, 45].includes(m);
}

/** End is a quarter-hour or `23:59` when the shift ends after the last quarter start. */
function isValidSlotEndHhmm(t: string): boolean {
  return isQuarterHourHhmm(t) || t === '23:59';
}

// ─── Worker assignment inside a day (match reply only) ─────────────────────────

export const WorkerAssignmentSchema = z.object({
  userId:      z.string(),
  displayName: z.string(),
  yearsExp:    z.number(),
  photoUrl:    z.string().nullable(),
  startTime:   z.string(),   // HH:mm — coverage segment for this worker on this day
  endTime:     z.string(),
});

// ─── One day in the schedule ──────────────────────────────────────────────────

export const DayScheduleSchema = z.object({
  date:        z.string(),   // YYYY-MM-DD
  dayOfWeek:   z.number(),   // 0=Sun … 6=Sat
  assignments: z.array(WorkerAssignmentSchema),
  covered:     z.boolean(),
});

// ─── Create & match ───────────────────────────────────────────────────────────

/** One requested shift segment within a calendar day (`dailyWindows[].slots`). */
const dailySlotEntry = z
  .object({
    startTime: timeHm,
    endTime:   timeHm,
  })
  .superRefine((slot, ctx) => {
    if (!isQuarterHourHhmm(slot.startTime)) {
      ctx.addIssue({
        code:    'custom',
        message: 'Start time must be on a 15-minute grid (e.g. 09:00, 09:15).',
        path:    ['startTime'],
      });
    }
    if (!isValidSlotEndHhmm(slot.endTime)) {
      ctx.addIssue({
        code:    'custom',
        message: 'End time must be on a 15-minute grid or 23:59.',
        path:    ['endTime'],
      });
    }
    const [sh, sm] = slot.startTime.split(':').map(Number);
    const [eh, em] = slot.endTime.split(':').map(Number);
    if (eh! * 60 + em! <= sh! * 60 + sm!) {
      ctx.addIssue({
        code:    'custom',
        message: 'End time must be after start time',
        path:    ['endTime'],
      });
    }
  });

const dailyWindowDay = z.object({
  date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slots:  z.array(dailySlotEntry).min(1),
});

/** Client draft + match preview — dates, positions, and per-day slot times only. */
export const CreateAndMatchBody = z
  .object({
    startDate: z.string().min(1),
    endDate:   z.string().nullable().optional(),
    dailyWindows: z.array(dailyWindowDay).min(1),
    positions: z.coerce.number().int().min(1).optional().default(1),
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.startDate);
    if (isNaN(start.getTime())) {
      ctx.addIssue({ code: 'custom', message: 'Invalid start date', path: ['startDate'] });
      return;
    }
    if (data.endDate) {
      const end = new Date(data.endDate);
      if (isNaN(end.getTime())) {
        ctx.addIssue({ code: 'custom', message: 'Invalid end date', path: ['endDate'] });
        return;
      }
      if (end < start) {
        ctx.addIssue({ code: 'custom', message: 'End date must be on or after start date', path: ['endDate'] });
      }
    }

    const startYmd = data.startDate.slice(0, 10);
    const endYmd   = data.endDate ? data.endDate.slice(0, 10) : startYmd;
    const expected = enumerateCalendarDays(startYmd, endYmd);

    const windows = data.dailyWindows;
    const dates = windows.map(w => w.date);
    if (new Set(dates).size !== dates.length) {
      ctx.addIssue({
        code:    'custom',
        message: 'Each calendar date must appear only once.',
        path:    ['dailyWindows'],
      });
    }

    const got = new Set(windows.map(w => w.date));
    for (const d of expected) {
      if (!got.has(d)) {
        ctx.addIssue({
          code:    'custom',
          message: `Missing shift times for ${d}`,
          path:    ['dailyWindows'],
        });
      }
    }
    for (const w of windows) {
      if (!expected.includes(w.date)) {
        ctx.addIssue({
          code:    'custom',
          message: `Unexpected date ${w.date}`,
          path:    ['dailyWindows'],
        });
      }
    }
  });

export const CreateAndMatchReply = z.object({
  jobId:          z.string(),
  schedule:       z.array(DayScheduleSchema),
  totalWorkers:   z.number(),
  fullyCovered:   z.boolean(),
  candidateCount: z.number(),
  ringCellCount:  z.number(),
  currency:       z.literal('CAD'),
});

/** Same payload as legacy create-and-match; only creates the draft row. */
export const CreateStaffRequestBody = CreateAndMatchBody;

export const CreateStaffRequestReply = z.object({
  jobId: z.string(),
});

export const PricingTierOfferSchema = z.object({
  tierId:         z.string(),
  label:          z.string(),
  description:    z.string(),
  hourlyRate:     z.number(),
  candidateCount: z.number(),
  available:      z.boolean(),
});

export const PricingTiersReply = z.object({
  tiers:         z.array(PricingTierOfferSchema),
  currency:      z.literal('CAD'),
  ringCellCount: z.number(),
});

export const MatchWithPricingBody = z.object({
  pricingTier: z.string().min(1),
  pricingRate: z.coerce.number().min(15, 'Minimum hourly rate is $15'),
});

export const ConfirmStaffRequestBody = z.object({
  notes: z.string().optional(),
});

// ─── Abandon draft ────────────────────────────────────────────────────────────

export const AbandonDraftParams = z.object({
  jobId: z.string().min(1),
});

export const OkReply = z.object({ ok: z.literal(true) });

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateAndMatchBodyType  = z.infer<typeof CreateAndMatchBody>;
export type CreateAndMatchReplyType = z.infer<typeof CreateAndMatchReply>;
export type CreateStaffRequestBodyType = z.infer<typeof CreateStaffRequestBody>;
export type MatchWithPricingBodyType = z.infer<typeof MatchWithPricingBody>;
