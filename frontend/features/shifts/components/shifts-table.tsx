"use client";

import { Link, useRouter } from "@/i18n/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatJobHourlyRateLine } from "@/lib/formatters";
import type { ShiftWithStaffRequestAndWorker } from "@/features/shifts/dal/queries";
import { STAFF_REQUEST_DISPLAY_TITLE } from "@/features/requests/constants";
import {
  effectiveHourlyRate,
  formatExpectedShiftEnd,
  formatExpectedShiftStart,
  formatShiftPay,
  formatShiftWorkerTableDate,
  formatShiftWorkerTableDuration,
  shiftHoursBetween,
} from "@/features/shifts/lib/present-shift";
import { formatShiftLocationLine } from "@/features/shifts/types/shift-location";
import { ShiftStatusBadge } from "./shift-status-badge";
import { WorkerShiftTableStatusCell } from "./worker-shift-table-status-cell";
import { cn } from "@/lib/utils";

function workerDisplayName(
  w: ShiftWithStaffRequestAndWorker["workers"],
): string {
  if (w == null) return "—";
  const name = `${w.first_name ?? ""} ${w.last_name ?? ""}`.trim();
  return name.length > 0 ? name : "—";
}

export function ShiftsTable({
  rows,
  variant,
}: {
  rows: ShiftWithStaffRequestAndWorker[];
  variant: "worker" | "client-all" | "client-request";
}) {
  const router = useRouter();
  const showWorker = variant !== "worker";
  const showRequestLink = variant === "client-all";
  const showRateAndPay = variant === "worker";

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground px-4 py-10 text-center text-sm">
        No shifts yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {variant === "worker" ? (
            <>
              <TableHead>Location</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Earning</TableHead>
              <TableHead>Status</TableHead>
            </>
          ) : (
            <>
              <TableHead>Request</TableHead>
              {showWorker ? <TableHead>Worker</TableHead> : null}
              <TableHead>Expected start</TableHead>
              <TableHead>Expected end</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead>Status</TableHead>
            </>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const sr = row.staff_requests;
          const requestLabel = STAFF_REQUEST_DISPLAY_TITLE;
          const hours = shiftHoursBetween(
            row.start_time,
            row.end_time,
          );
          const rate = showRateAndPay
            ? effectiveHourlyRate(row.hourly_rate, sr?.pricing_rate)
            : null;
          const { hoursLabel, payLabel } = formatShiftPay(hours, rate);
          const expectedStart = formatExpectedShiftStart(
            row.start_time,
            sr?.start_date ?? null,
          );
          const expectedEnd = formatExpectedShiftEnd(
            row.end_time,
            sr?.start_date ?? null,
          );
          const addressLine = formatShiftLocationLine(row.location);
          const fallbackDate = sr?.start_date ?? null;

          if (variant === "worker") {
            const dateLabel = formatShiftWorkerTableDate(
              row.start_time,
              fallbackDate,
            );
            const durationLabel = formatShiftWorkerTableDuration(
              row.start_time,
              row.end_time,
            );

            return (
              <TableRow
                key={row.id}
                className={cn(
                  "cursor-pointer rounded-md hover:bg-muted/60",
                  "focus-within:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                )}
                tabIndex={0}
                role="button"
                aria-label={`Open shift on ${dateLabel}`}
                onClick={() => {
                  router.push(`/worker/shifts/${row.id}`);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/worker/shifts/${row.id}`);
                  }
                }}
              >
                <TableCell className="max-w-[min(28rem,55vw)] text-muted-foreground">
                  <span className="line-clamp-2 break-words" title={addressLine}>
                    {addressLine}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {dateLabel}
                </TableCell>
                <TableCell className="text-muted-foreground min-w-[12rem]">
                  {durationLabel}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatJobHourlyRateLine(rate, "CAD", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </TableCell>
                <TableCell className="font-medium tabular-nums">
                  {payLabel}
                </TableCell>
                <TableCell
                  className="w-[1%] whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <WorkerShiftTableStatusCell shiftId={row.id} status={row.status} />
                </TableCell>
              </TableRow>
            );
          }

          return (
            <TableRow key={row.id}>
              {showRequestLink ? (
                <TableCell className="max-w-[220px] font-medium">
                  <Link
                    href={`/client/shifts/${row.id}`}
                    className="text-primary hover:underline"
                  >
                    {requestLabel}
                  </Link>
                </TableCell>
              ) : (
                <TableCell className="max-w-[200px] font-medium">
                  {variant === "client-request" ? (
                    <Link
                      href={`/client/shifts/${row.id}`}
                      className="text-primary hover:underline"
                    >
                      {requestLabel}
                    </Link>
                  ) : (
                    requestLabel
                  )}
                </TableCell>
              )}
              {showWorker ? (
                <TableCell className="text-muted-foreground">
                  {workerDisplayName(row.workers)}
                </TableCell>
              ) : null}
              <TableCell className="text-muted-foreground min-w-[10.5rem] max-w-[14rem] text-sm leading-snug">
                {expectedStart}
              </TableCell>
              <TableCell className="text-muted-foreground min-w-[10.5rem] max-w-[14rem] text-sm leading-snug">
                {expectedEnd}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {hoursLabel}
              </TableCell>
              {showRateAndPay ? (
                <>
                  <TableCell className="text-right tabular-nums">
                    {formatJobHourlyRateLine(rate)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {payLabel}
                  </TableCell>
                </>
              ) : null}
              <TableCell>
                <ShiftStatusBadge status={row.status} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
