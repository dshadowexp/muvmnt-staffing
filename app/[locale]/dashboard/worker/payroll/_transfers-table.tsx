"use client";

import type { WorkerTransferRow } from "@/features/payments/payroll/dal/queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useTablePagination,
  TablePagination,
} from "@/components/table-pagination";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

function formatCents(cents: number, currency: string) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  succeeded: "default",
  pending: "secondary",
  failed: "destructive",
};

export function TransfersTable({ transfers }: { transfers: WorkerTransferRow[] }) {
  const pagination = useTablePagination(transfers);
  const rows = pagination.rows;

  if (transfers.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No transfers yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Shift</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="text-sm">
                {format(new Date(t.created_at), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {format(new Date(t.shift_start), "MMM d")}
                {" · "}
                {format(new Date(t.shift_start), "h:mm a")}
                {" – "}
                {format(new Date(t.shift_end), "h:mm a")}
              </TableCell>
              <TableCell className="text-sm tabular-nums font-medium">
                {formatCents(t.amount_cents, t.currency)}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[t.status] ?? "outline"} className="capitalize">
                  {t.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
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
    </div>
  );
}
