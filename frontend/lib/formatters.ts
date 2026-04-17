const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
});

export function formatDateTime(date: Date) {
    return DATE_TIME_FORMATTER.format(date);
}

export function formatCurrency(amount: number, currency = "USD", fractionDigits = 2) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    }).format(amount);
}

/** Hourly rate before pricing is accepted (null or ≤0). For badges: includes `/hr` when set. */
export function formatJobHourlyRateLine(
  amount: number | null | undefined,
  currency = "CAD",
  opts?: { minimumFractionDigits?: number; maximumFractionDigits?: number },
) {
  if (amount == null || amount <= 0) return "Pending";
  const min = opts?.minimumFractionDigits ?? 2;
  const max = opts?.maximumFractionDigits ?? 2;
  return `${new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(amount)}`;
}

/** Format time string (e.g. "09:00" or "09:00:00") to "9:00 AM" */
export function formatTime(time: string) {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${(m ?? 0).toString().padStart(2, "0")} ${period}`;
}

/**
 * Calendar `{ day, month, year }` from a `yyyy-MM-dd` string (e.g. worker DOB in the DB).
 * Month is 1–12. Uses the string parts directly so there is no timezone shift from `Date`.
 */
export function calendarPartsFromYyyyMmDd(
  dateStr: string | null | undefined,
): { day: number; month: number; year: number } | undefined {
  if (!dateStr?.trim()) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (!m) return undefined;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (
    !Number.isFinite(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return undefined;
  }
  return { day, month, year };
}

/** Format raw input to E.164 Canadian format (+1XXXXXXXXXX) */
export function formatPhoneToE164(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
    return `+${digits}`;
}

/**
 * Parses an address string into its component fields:
 * street, city, province, postalCode, country
 * 
 * Accepts addresses in "street, city, province postalCode, country" form.
 * Example: "123 Main St, Toronto, ON M5V 2T6, Canada"
 */
export function parseAddress(address: string): {
    street?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
} {
    // Split by comma and trim each part
    const parts = address.split(',').map(part => part.trim());

    // Basic fallback in case format is not as expected
    if (parts.length < 3) {
        return {
            street: parts[0] || undefined,
            city: parts[1] || undefined,
        };
    }

    const street = parts[0];
    const city = parts[1];
    let province: string | undefined, postalCode: string | undefined;

    // Try to extract province and postal from the third field
    // e.g. "ON M5V 2T6"
    const provincePostal = parts[2];
    if (provincePostal) {
        const match = provincePostal.match(/^([A-Za-z]{2,})\s+(.+)/);
        if (match) {
            province = match[1];
            postalCode = match[2];
        } else {
            province = provincePostal;
        }
    }

    const country = parts[3] || undefined;

    return {
        street,
        city,
        province,
        postalCode,
        country,
    };
}