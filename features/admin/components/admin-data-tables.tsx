import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { format } from "date-fns";
import type { AdminClientRow, AdminJobRow } from "@/features/admin/dal/queries";

export { AdminWorkersTable } from "@/features/admin/components/admin-workers-table";

export function AdminClientsTable({ clients }: { clients: AdminClientRow[] }) {
  return (
    <Card size="sm" className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="font-mono text-xs">User ID</TableHead>
            <TableHead className="text-right">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-muted-foreground py-8 text-center"
              >
                No clients yet
              </TableCell>
            </TableRow>
          ) : (
            clients.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.type}</TableCell>
                <TableCell className="text-muted-foreground max-w-[140px] truncate font-mono text-xs">
                  {c.user_id}
                </TableCell>
                <TableCell className="text-muted-foreground text-right">
                  {format(new Date(c.created_at), "MMM d, yyyy")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

export function AdminJobsTable({ jobs }: { jobs: AdminJobRow[] }) {
  return (
    <Card size="sm" className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Request</TableHead>
            <TableHead className="text-right">Positions</TableHead>
            <TableHead className="font-mono text-xs">Client ID</TableHead>
            <TableHead className="text-right">Start</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-muted-foreground py-8 text-center"
              >
                No job postings yet
              </TableCell>
            </TableRow>
          ) : (
            jobs.map((j) => (
              <TableRow key={j.id}>
                <TableCell className="font-medium">Staff request</TableCell>
                <TableCell className="text-right tabular-nums">
                  {j.positions}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[140px] truncate font-mono text-xs">
                  {j.client_id}
                </TableCell>
                <TableCell className="text-muted-foreground text-right">
                  {format(new Date(j.start_date), "MMM d, yyyy")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

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
