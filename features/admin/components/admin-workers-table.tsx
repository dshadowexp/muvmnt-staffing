"use client";

import type { AdminWorkerRow } from "@/features/admin/dal/queries";
import { Badge } from "@/components/ui/badge";
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
import { useRouter } from "@/i18n/navigation";
import { format } from "date-fns";
import { CircleCheckIcon, LoaderIcon } from "lucide-react";

function WorkerStatusBadge({ status }: { status: string | null }) {
  const label = status?.trim() || "Pending";
  const normalized = label.toLowerCase();
  const isComplete =
    normalized === "done" ||
    normalized === "active" ||
    normalized === "approved" ||
    normalized === "verified";

  return (
    <Badge variant="outline" className="text-muted-foreground gap-1.5 px-1.5">
      {isComplete ? (
        <CircleCheckIcon className="size-3.5 shrink-0 fill-green-500 dark:fill-green-400" />
      ) : (
        <LoaderIcon className="size-3.5 shrink-0" />
      )}
      {label}
    </Badge>
  );
}

export function AdminWorkersTable({
  workers,
  preview = false,
  emptyLabel = "No workers yet",
}: {
  workers: AdminWorkerRow[];
  preview?: boolean;
  emptyLabel?: string;
}) {
  const router = useRouter();
  const pagination = useTablePagination(workers);
  const rows = preview ? workers : pagination.rows;

  function go(workerId: string) {
    router.push(`/admin/workers/${workerId}`);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Profession</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Joined</TableHead>
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
            rows.map((w) => (
              <TableRow
                key={w.id}
                role="button"
                tabIndex={0}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => go(w.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    go(w.id);
                  }
                }}
              >
                <TableCell className="font-medium">
                  {w.first_name} {w.last_name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {w.profession}
                </TableCell>
                <TableCell>
                  <WorkerStatusBadge status={w.status} />
                </TableCell>
                <TableCell className="text-muted-foreground text-right">
                  {format(new Date(w.created_at), "MMM d, yyyy")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
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
