import { formatInTimeZone } from "date-fns-tz";
import { SHIFT_SCHEDULE_TIMEZONE } from "@/features/shifts/lib/shift-schedule-timezone";

/** Cap on “respond by” from booking time (policy window). */
const MAX_POLICY_MS = 24 * 60 * 60 * 1000;

/** Never ask the worker to respond later than this before shift start. */
const BUFFER_BEFORE_SHIFT_MS = 60 * 60 * 1000;

/** Minimum time from “now” to response deadline. */
const MIN_RESPONSE_MS = 15 * 60 * 1000;

/** Minimum delay before running the next offer-worker pass. */
const MIN_OFFER_DELAY_MS = 60 * 1000;

/** Safety cap so Trigger.dev delay stays bounded. */
const MAX_OFFER_DELAY_MS = 48 * 60 * 60 * 1000;

export type WorkerResponseWindow = {
  /** Absolute deadline (ms since epoch). */
  deadlineMs: number;
  /** Delay until offer-worker should run if there is still no assignee. */
  offerWorkerDelayMs: number;
  /** Human-readable deadline in the shift schedule timezone. */
  deadlineFormatted: string;
  /** Short phrase, e.g. “18 hours” or “45 minutes”. */
  relativePhrase: string;
  /** Single-line copy for email preview / subject helper. */
  responseSummaryLine: string;
};

/**
 * Computes when the current assignee must respond by and when to run the next
 * offer pass. Uses min(24h policy, shift_start − 1h), floored to at least 15m from now.
 */
export function computeWorkerResponseWindow(
  nowMs: number,
  earliestShiftStartMs: number,
): WorkerResponseWindow {
  const policyDeadline = nowMs + MAX_POLICY_MS;
  const urgencyDeadline = earliestShiftStartMs - BUFFER_BEFORE_SHIFT_MS;
  let deadline = Math.min(policyDeadline, urgencyDeadline);
  deadline = Math.max(deadline, nowMs + MIN_RESPONSE_MS);
  if (deadline > policyDeadline) deadline = policyDeadline;

  const offerWorkerDelayMs = Math.min(
    MAX_OFFER_DELAY_MS,
    Math.max(MIN_OFFER_DELAY_MS, deadline - nowMs),
  );

  const deadlineDate = new Date(deadline);
  const deadlineFormatted = formatInTimeZone(
    deadlineDate,
    SHIFT_SCHEDULE_TIMEZONE,
    "EEEE, MMM d 'at' h:mm a zzz",
  );

  const msLeft = deadline - nowMs;
  const hoursLeft = msLeft / (60 * 60 * 1000);
  const relativePhrase =
    hoursLeft >= 2
      ? `${Math.round(hoursLeft)} hours`
      : `${Math.max(1, Math.round(msLeft / (60 * 1000)))} minutes`;

  const responseSummaryLine = `Please respond by ${deadlineFormatted} (${relativePhrase} from now).`;

  return {
    deadlineMs: deadline,
    offerWorkerDelayMs,
    deadlineFormatted,
    relativePhrase,
    responseSummaryLine,
  };
}

/** Trigger.dev `delay` accepts a duration string; use seconds for dynamic values. */
export function offerWorkerDelayToTriggerDelay(delayMs: number): string {
  const sec = Math.max(1, Math.floor(delayMs / 1000));
  return `${sec}s`;
}
