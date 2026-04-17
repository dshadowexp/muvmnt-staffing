"use client";

import type { ClientPaymentRow } from "@/features/billing/dal/queries";
import { cardDisplayFromPaymentMethodJson } from "@/features/requests/lib/payment-method-card-display";
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
import { format } from "date-fns";

function formatCents(cents: number | null, currency: string) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function PaymentsTable({ payments }: { payments: ClientPaymentRow[] }) {
  const pagination = useTablePagination(payments);
  const rows = pagination.rows;

  if (payments.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No payments yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Payment method</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="text-sm">
                {format(new Date(p.created_at), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="text-sm tabular-nums">
                {formatCents(p.amount_cents, p.currency)}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {cardDisplayFromPaymentMethodJson(p.payment_method) ?? "—"}
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
