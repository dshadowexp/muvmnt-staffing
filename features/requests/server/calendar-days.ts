/** Inclusive UTC calendar days `YYYY-MM-DD` from start to end (or start only if end null). */
const MAX_SCHEDULE_DAYS = 400;

export function enumerateCalendarDays(
    startIso: string,
    endIso: string | null | undefined,
): string[] {
    const endStr = endIso ?? startIso;
    const startMs = Date.UTC(
        parseInt(startIso.slice(0, 4), 10),
        parseInt(startIso.slice(5, 7), 10) - 1,
        parseInt(startIso.slice(8, 10), 10),
    );
    const endMs = Date.UTC(
        parseInt(endStr.slice(0, 4), 10),
        parseInt(endStr.slice(5, 7), 10) - 1,
        parseInt(endStr.slice(8, 10), 10),
    );

    const days: string[] = [];
    let n = 0;
    for (let ms = startMs; ms <= endMs && n < MAX_SCHEDULE_DAYS; ms += 86_400_000, n++) {
        const d = new Date(ms);
        const y = d.getUTCFullYear();
        const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
        const da = String(d.getUTCDate()).padStart(2, "0");
        days.push(`${y}-${mo}-${da}`);
    }
    return days;
}
