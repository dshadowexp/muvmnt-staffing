"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TablePagination,
  useTablePagination,
} from "@/components/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Link, useRouter } from "@/i18n/navigation";
import { format } from "date-fns";
import { CircleCheckIcon, ClockIcon } from "lucide-react";
import type {
  AdminAuthorizationRow,
  AdminClientRow,
  AdminComplianceRow,
  AdminJobRow,
  AdminShiftRow,
} from "@/features/admin/dal/queries";

export { AdminWorkersTable } from "@/features/admin/components/admin-workers-table";

function VerifiedBadge({ verified }: { verified: boolean }) {
  return (
    <Badge variant="outline" className="text-muted-foreground gap-1.5 px-1.5">
      {verified ? (
        <CircleCheckIcon className="size-3.5 shrink-0 fill-green-500 dark:fill-green-400" />
      ) : (
        <ClockIcon className="size-3.5 shrink-0" />
      )}
      {verified ? "Verified" : "Pending"}
    </Badge>
  );
}

function ShiftStatusBadge({ status }: { status: string | null }) {
  const label = status?.trim() || "Pending";
  return (
    <Badge variant="outline" className="text-muted-foreground gap-1.5 px-1.5">
      {label}
    </Badge>
  );
}

function RequestStatusBadge({ status }: { status: string }) {
  const label = status.trim() || "Pending";
  return (
    <Badge variant="outline" className="text-muted-foreground gap-1.5 px-1.5">
      {label}
    </Badge>
  );
}

function formatDateTimeShort(date: Date) {
  return format(date, "MMM d, yyyy h:mm a");
}

function PaginatedShell({
  children,
  preview,
  pagination,
}: {
  children: React.ReactNode;
  preview: boolean;
  pagination: ReturnType<typeof useTablePagination>;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      {children}
      {!preview && pagination.pageCount > 1 && (
        <TablePagination
          totalRows={pagination.totalRows}
          pageIndex={pagination.pageIndex}
          pageSize={pagination.pageSize}
          pageCount={pagination.pageCount}
          onPageChange={pagination.setPageIndex}
          onPageSizeChange={pagination.setPageSize}
        />
      )}
    </div>
  );
}

// ---------- Clients ----------

export function AdminClientsTable({
  clients,
  preview = false,
  emptyLabel = "No clients yet",
}: {
  clients: AdminClientRow[];
  preview?: boolean;
  emptyLabel?: string;
}) {
  const router = useRouter();
  const pagination = useTablePagination(clients);
  const rows = preview ? clients : pagination.rows;

  function go(clientId: string) {
    router.push(`/admin/clients/${clientId}`);
  }

  return (
    <PaginatedShell preview={preview} pagination={pagination}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={3}
                className="text-muted-foreground py-8 text-center"
              >
                {emptyLabel}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((c) => (
              <TableRow
                key={c.id}
                role="button"
                tabIndex={0}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => go(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    go(c.id);
                  }
                }}
              >
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.type}</TableCell>
                <TableCell className="text-muted-foreground text-right">
                  {format(new Date(c.created_at), "MMM d, yyyy")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </PaginatedShell>
  );
}

// ---------- Requests (jobs) ----------

export function AdminJobsTable({
  jobs,
  preview = false,
  emptyLabel = "No requests yet",
}: {
  jobs: AdminJobRow[];
  preview?: boolean;
  emptyLabel?: string;
}) {
  const router = useRouter();
  const pagination = useTablePagination(jobs);
  const rows = preview ? jobs : pagination.rows;

  function go(jobId: string) {
    router.push(`/admin/requests/${jobId}`);
  }

  return (
    <PaginatedShell preview={preview} pagination={pagination}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead className="text-right">Positions</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Start</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-muted-foreground py-8 text-center"
              >
                {emptyLabel}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((j) => (
              <TableRow
                key={j.id}
                role="button"
                tabIndex={0}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => go(j.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    go(j.id);
                  }
                }}
              >
                <TableCell className="font-medium">
                  {j.client_name ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {j.positions}
                </TableCell>
                <TableCell>
                  <RequestStatusBadge status={j.status} />
                </TableCell>
                <TableCell className="text-muted-foreground text-right">
                  {format(new Date(j.start_date), "MMM d, yyyy")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </PaginatedShell>
  );
}

// ---------- Shifts ----------

export function AdminShiftsTable({
  shifts,
  preview = false,
  emptyLabel = "No shifts yet",
}: {
  shifts: AdminShiftRow[];
  preview?: boolean;
  emptyLabel?: string;
}) {
  const router = useRouter();
  const pagination = useTablePagination(shifts);
  const rows = preview ? shifts : pagination.rows;

  function go(shiftId: string) {
    router.push(`/admin/shifts/${shiftId}`);
  }

  return (
    <PaginatedShell preview={preview} pagination={pagination}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Worker</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-muted-foreground py-8 text-center"
              >
                {emptyLabel}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((s) => (
              <TableRow
                key={s.id}
                role="button"
                tabIndex={0}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => go(s.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    go(s.id);
                  }
                }}
              >
                <TableCell className="font-medium">
                  {s.worker_name ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {s.client_name ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {formatDateTimeShort(new Date(s.start_time))}
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {formatDateTimeShort(new Date(s.end_time))}
                </TableCell>
                <TableCell>
                  <ShiftStatusBadge status={s.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </PaginatedShell>
  );
}

// ---------- Authorizations ----------

export function AdminAuthorizationsTable({
  items,
  preview = false,
  emptyLabel = "No authorization documents on file",
}: {
  items: AdminAuthorizationRow[];
  preview?: boolean;
  emptyLabel?: string;
}) {
  const router = useRouter();
  const pagination = useTablePagination(items);
  const rows = preview ? items : pagination.rows;

  function go(authorizationId: string) {
    router.push(`/admin/authorization/${authorizationId}`);
  }

  return (
    <PaginatedShell preview={preview} pagination={pagination}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Worker</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Uploaded</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-muted-foreground py-8 text-center"
              >
                {emptyLabel}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((a) => (
              <TableRow
                key={a.id}
                role="button"
                tabIndex={0}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => go(a.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    go(a.id);
                  }
                }}
              >
                <TableCell className="font-medium">
                  {a.worker_name ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{a.type}</TableCell>
                <TableCell>
                  <VerifiedBadge verified={a.is_verified} />
                </TableCell>
                <TableCell className="text-muted-foreground text-right">
                  {format(new Date(a.created_at), "MMM d, yyyy")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </PaginatedShell>
  );
}

// ---------- Compliances ----------

export function AdminCompliancesTable({
  items,
  preview = false,
  emptyLabel = "No compliance documents on file",
}: {
  items: AdminComplianceRow[];
  preview?: boolean;
  emptyLabel?: string;
}) {
  const router = useRouter();
  const pagination = useTablePagination(items);
  const rows = preview ? items : pagination.rows;

  function go(complianceId: string) {
    router.push(`/admin/compliance/${complianceId}`);
  }

  return (
    <PaginatedShell preview={preview} pagination={pagination}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Worker</TableHead>
            <TableHead>Document</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Uploaded</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-muted-foreground py-8 text-center"
              >
                {emptyLabel}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((c) => (
              <TableRow
                key={c.id}
                role="button"
                tabIndex={0}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => go(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    go(c.id);
                  }
                }}
              >
                <TableCell className="font-medium">
                  {c.worker_name ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{c.name}</TableCell>
                <TableCell>
                  <VerifiedBadge verified={c.is_verified} />
                </TableCell>
                <TableCell className="text-muted-foreground text-right">
                  {format(new Date(c.created_at), "MMM d, yyyy")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </PaginatedShell>
  );
}

// ---------- Section header ----------

export function AdminSectionHeader({
  title,
  description,
  href,
  linkLabel = "View all",
}: {
  title: string;
  description: string;
  href: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-base font-medium">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <Link
        href={href}
        className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
      >
        {linkLabel}
      </Link>
    </div>
  );
}
