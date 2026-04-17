"use client";

import type { KeyboardEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatJobHourlyRateLine } from "@/lib/formatters";
import type { ShiftWithStaffRequestAndWorker } from "@/features/shifts/dal/queries";
import type { ShiftTableRow } from "@/features/shifts/types/shift-table-row";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useTablePagination,
  TablePagination,
} from "@/components/table-pagination";
import { cn } from "@/lib/utils";

function workerDisplayName(
  w: ShiftWithStaffRequestAndWorker["workers"],
): string {
  if (w == null) return "—";
  const name = `${w.first_name ?? ""} ${w.last_name ?? ""}`.trim();
  return name.length > 0 ? name : "—";
}

function workerInitials(
  w: ShiftWithStaffRequestAndWorker["workers"],
): string {
  if (w == null) return "?";
  const a = (w.first_name?.trim()?.[0] ?? "").toUpperCase();
  const b = (w.last_name?.trim()?.[0] ?? "").toUpperCase();
  const pair = `${a}${b}`;
  return pair.length > 0 ? pair : "?";
}

/** Presigned or public URL for avatar; avoids using raw S3 keys in `<img>`. */
function workerAvatarSrc(row: ShiftTableRow): string | undefined {
  const resolved = row.workers_photo_src;
  if (resolved != null && resolved !== "") return resolved;
  const raw = row.workers?.photo_url;
  if (raw != null && raw !== "" && /^https?:\/\//i.test(raw)) return raw;
  return undefined;
}

export function ShiftsTable({
  rows: allRows,
  variant,
}: {
  rows: ShiftTableRow[];
  variant: "worker" | "client-all" | "client-request";
}) {
  const router = useRouter();
  const showWorker = variant !== "worker";
  const showRequestLink = variant === "client-all";
  const showRateAndPay = variant === "worker";
  const showRequestColumn = variant === "client-all";
  const showHoursColumn = variant === "client-all";
  const isClientRequestVariant = variant === "client-request";

  const pagination = useTablePagination(allRows);
  const rows = pagination.rows;

  if (allRows.length === 0) {
    return (
      <p className="text-muted-foreground px-4 py-10 text-center text-sm">
        No shifts yet.
      </p>
    );
  }

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow>
          {variant === "worker" ? (
            <>
              <TableHead>Location</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>{`Rate (/hr)`}</TableHead>
              <TableHead>{`Earnings`}</TableHead>
              <TableHead>Status</TableHead>
            </>
          ) : (
            <>
              {showRequestColumn ? <TableHead>Request</TableHead> : null}
              {showWorker ? <TableHead>Worker</TableHead> : null}
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              {showHoursColumn ? (
                <TableHead>Hours</TableHead>
              ) : null}
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
                  {formatJobHourlyRateLine(rate)}
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

          const workerNameLabel = workerDisplayName(row.workers);
          const workerAvatarUrl = workerAvatarSrc(row);

          return (
            <TableRow
              key={row.id}
              className={
                isClientRequestVariant
                  ? cn(
                      "cursor-pointer rounded-md hover:bg-muted/60",
                      "focus-within:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    )
                  : undefined
              }
              tabIndex={isClientRequestVariant ? 0 : undefined}
              role={isClientRequestVariant ? "button" : undefined}
              aria-label={
                isClientRequestVariant
                  ? `Open shift for ${workerNameLabel}`
                  : undefined
              }
              onClick={
                isClientRequestVariant
                  ? () => {
                      router.push(`/client/requests/${row.request_id}/shifts/${row.id}`);
                    }
                  : undefined
              }
              onKeyDown={
                isClientRequestVariant
                  ? (e: KeyboardEvent<HTMLTableRowElement>) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/client/requests/${row.request_id}/shifts/${row.id}`);
                      }
                    }
                  : undefined
              }
            >
              {showRequestColumn ? (
                showRequestLink ? (
                  <TableCell className="max-w-[220px] font-medium">
                    <Link
                      href={`/client/requests/${row.request_id}/shifts/${row.id}`}
                      className="text-primary hover:underline"
                    >
                      {requestLabel}
                    </Link>
                  </TableCell>
                ) : (
                  <TableCell className="max-w-[200px] font-medium">{requestLabel}</TableCell>
                )
              ) : null}
              {showWorker ? (
                <TableCell className="text-muted-foreground">
                  <div className="flex min-w-0 max-w-[min(100%,18rem)] items-center gap-2">
                    <Avatar size="sm" className="shrink-0">
                      {workerAvatarUrl ? (
                        <AvatarImage
                          src={workerAvatarUrl}
                          alt={
                            workerNameLabel === "—"
                              ? "Worker"
                              : workerNameLabel
                          }
                        />
                      ) : null}
                      <AvatarFallback className="text-[10px] font-medium">
                        {workerInitials(row.workers)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate" title={workerNameLabel}>
                      {workerNameLabel}
                    </span>
                  </div>
                </TableCell>
              ) : null}
              <TableCell className="text-muted-foreground min-w-[10.5rem] max-w-[14rem] text-sm leading-snug">
                {expectedStart}
              </TableCell>
              <TableCell className="text-muted-foreground min-w-[10.5rem] max-w-[14rem] text-sm leading-snug">
                {expectedEnd}
              </TableCell>
              {showHoursColumn ? (
                <TableCell className="tabular-nums">{hoursLabel}</TableCell>
              ) : null}
              {showRateAndPay ? (
                <>
                  <TableCell className="tabular-nums">
                    {formatJobHourlyRateLine(rate)}
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">
                    {payLabel}
                  </TableCell>
                </>
              ) : null}
              <TableCell
                onClick={isClientRequestVariant ? (e) => e.stopPropagation() : undefined}
                onKeyDown={isClientRequestVariant ? (e) => e.stopPropagation() : undefined}
              >
                <ShiftStatusBadge status={row.status} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    {pagination.pageCount > 1 && (
      <TablePagination
        totalRows={pagination.totalRows}
        pageIndex={pagination.pageIndex}
        pageSize={pagination.pageSize}
        pageCount={pagination.pageCount}
        onPageChange={pagination.setPageIndex}
        onPageSizeChange={pagination.setPageSize}
      />
    )}
    </>
  );
}
