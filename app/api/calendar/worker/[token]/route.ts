import { NextResponse } from "next/server";

import { buildWorkerShiftsIcs } from "@/features/calendar/build-worker-ics";
import {
  getWorkerIdByCalendarToken,
  listShiftsForWorkerCalendarFeed,
} from "@/features/calendar/server/worker-calendar-feed";
import { env } from "@/data/env/server";

export async function GET(
  _req: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  if (!token || token.length < 64) {
    return new NextResponse("Not found", { status: 404 });
  }

  const workerId = await getWorkerIdByCalendarToken(token);
  if (!workerId) {
    return new NextResponse("Not found", { status: 404 });
  }

  const shifts = await listShiftsForWorkerCalendarFeed(workerId);

  let calendarUidHost = "readykare";
  try {
    calendarUidHost = new URL(env.APP_URL).hostname.replace(/\./g, "-");
  } catch {
    /* ignore */
  }

  const body = buildWorkerShiftsIcs({
    shifts,
    calendarUidHost,
    dtstampIso: new Date().toISOString(),
  });

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, max-age=300",
    },
  });
}
