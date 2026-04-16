export const DAY_ORDER = [0, 1, 2, 3, 4, 5, 6] as const;

export const DAY_LABELS: Record<(typeof DAY_ORDER)[number], string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

export const DEFAULT_SLOT = { start: "09:00", end: "17:00" };

/** IANA zones — matches typical scheduling UIs. */
export const COMMON_TIMEZONES = [
  "America/Toronto",
  "America/Vancouver",
  "America/Edmonton",
  "America/Winnipeg",
  "America/Halifax",
  "America/St_Johns",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "UTC",
  "Europe/London",
] as const;
