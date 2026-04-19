"use client";

import type { AdminWorkerRow } from "@/features/admin/dal/queries";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <Badge variant="outline" className="gap-1.5 px-1.5 text-muted-foreground">
      {isComplete ? (
        <CircleCheckIcon className="size-3.5 shrink-0 fill-green-500 dark:fill-green-400" />
      ) : (
        <LoaderIcon className="size-3.5 shrink-0" />
      )}
      {label}
    </Badge>
  );
}

export function AdminWorkersTable({ workers }: { workers: AdminWorkerRow[] }) {
  const router = useRouter();

  function goToWorker(workerId: string) {
    router.push(`/admin/workers/${workerId}`);
  }

  return (
    <Card size="sm" className="py-0">
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
          {workers.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-muted-foreground py-8 text-center"
              >
                No workers yet
              </TableCell>
            </TableRow>
          ) : (
            workers.map((w) => (
              <TableRow
                key={w.id}
                role="link"
                tabIndex={0}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => goToWorker(w.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goToWorker(w.id);
                  }
                }}
              >
                <TableCell className="font-medium">
                  {w.first_name} {w.last_name}
                </TableCell>
                <TableCell>{w.profession}</TableCell>
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
    </Card>
  );
}
