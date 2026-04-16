import type { ShiftRow } from "@/features/shifts/dal/queries";
import { parseShiftLocation } from "@/features/shifts/types/shift-location";

export function ShiftLocationDetails({ location }: { location: ShiftRow["location"] }) {
  const loc = parseShiftLocation(location);
  if (loc == null) return null;

  const mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(String(loc.lat))},${encodeURIComponent(String(loc.lng))}`;

  return (
    <div className="sm:col-span-2">
      <dt className="text-muted-foreground text-sm font-medium">Location</dt>
      <dd className="mt-0.5 space-y-2 text-sm">
        <p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-medium hover:underline"
          >
            {loc.address}
          </a>
        </p>
      </dd>
    </div>
  );
}
