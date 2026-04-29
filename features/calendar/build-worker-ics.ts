import "server-only";

import { Buffer } from "node:buffer";

/** Escape TEXT values per RFC 5545 §3.3.11 */
export function icsEscapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Fold one logical line to ≤75 octets per physical line (CRLF + space continuation). */
export function foldIcsLine(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let offset = 0;
  while (offset < bytes.length) {
    const maxTake = offset === 0 ? 75 : 74;
    const slice = bytes.subarray(offset, offset + maxTake);
    parts.push(
      offset === 0
        ? slice.toString("utf8")
        : ` ${slice.toString("utf8")}`,
    );
    offset += slice.length;
  }
  return parts.join("\r\n");
}

function formatUtcCompact(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}${mo}${day}T${h}${mi}${s}Z`;
}

export type IcsShiftRow = {
  id: string;
  start_time: string;
  end_time: string;
  status: string | null;
  location: { address?: string } | null;
  facilities: { name: string } | null;
};

export function buildWorkerShiftsIcs(params: {
  shifts: IcsShiftRow[];
  calendarUidHost: string;
  dtstampIso: string;
}): string {
  const { shifts, calendarUidHost, dtstampIso } = params;
  const dtstamp = formatUtcCompact(dtstampIso);
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//readykare//worker-shifts//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
    "X-PUBLISHED-TTL:PT12H",
  ];

  for (const sh of shifts) {
    const start = formatUtcCompact(sh.start_time);
    const end = formatUtcCompact(sh.end_time);
    if (!start || !end) continue;

    const facilityName = sh.facilities?.name?.trim() || "Shift";
    const addr =
      typeof sh.location === "object" &&
      sh.location &&
      typeof sh.location.address === "string"
        ? sh.location.address.trim()
        : "";
    const summary = icsEscapeText(`ReadyKare — ${facilityName}`);
    const locationLine = addr ? icsEscapeText(addr) : "";
    const desc = icsEscapeText(
      `Status: ${sh.status ?? "unknown"}\nShift ID: ${sh.id}`,
    );
    const uid = `shift-${sh.id}@${calendarUidHost}`;
    const status =
      (sh.status ?? "").toLowerCase() === "scheduled" ? "TENTATIVE" : "CONFIRMED";

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${summary}`,
      ...(locationLine ? [`LOCATION:${locationLine}`] : []),
      `DESCRIPTION:${desc}`,
      "TRANSP:OPAQUE",
      `STATUS:${status}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
