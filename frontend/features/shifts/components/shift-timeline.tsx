import { format, isValid, parseISO } from "date-fns";
import {
  buildShiftTimelineEvents,
  type ShiftTimelineAudience,
  type ShiftTimelineFields,
} from "@/features/shifts/lib/shift-timeline";

function formatEventAt(value: string): string {
  if (value == null || value === "") return "—";
  const normalized = /^\d{4}-\d{2}-\d{2}\s+\d/.test(value.trim())
    ? value.trim().replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T")
    : value.trim();
  const d = parseISO(normalized);
  if (!isValid(d)) return value;
  return format(d, "MMM d, yyyy · h:mm a");
}

export function ShiftTimeline({
  shift,
  audience = "client",
}: {
  shift: ShiftTimelineFields;
  audience?: ShiftTimelineAudience;
}) {
  const events = buildShiftTimelineEvents(shift, audience);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium">Events</h2>
      <ul className="divide-y divide-border rounded-lg border border-border text-sm">
        {events.map((e) => (
          <li
            key={e.id}
            className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <span className="text-foreground">{e.label}</span>
            <time
              className="text-muted-foreground shrink-0 tabular-nums"
              dateTime={e.at}
            >
              {formatEventAt(e.at)}
            </time>
          </li>
        ))}
      </ul>
    </section>
  );
}
