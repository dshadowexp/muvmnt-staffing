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
import { useTranslations } from "next-intl";
import { tryNormalizeProfessionId } from "@/lib/professions";
import { format } from "date-fns";
import { CircleCheckIcon, LoaderIcon } from "lucide-react";

function WorkerStageBadge({ stage }: { stage: string | null }) {
  const label = stage?.trim() || "—";
  const normalized = label.toLowerCase();
  const isLive = normalized === "live";

  return (
    <Badge variant="outline" className="text-muted-foreground gap-1.5 px-1.5 capitalize">
      {isLive ? (
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
  const tProf = useTranslations("professions");
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
            <TableHead>Stage</TableHead>
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
            rows.map((w) => {
              const professionId = tryNormalizeProfessionId(w.profession);
              const professionLabel = professionId
                ? tProf(professionId)
                : w.profession || "—";
              return (
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
                  {professionLabel}
                </TableCell>
                <TableCell>
                  <WorkerStageBadge stage={w.stage} />
                </TableCell>
                <TableCell className="text-muted-foreground text-right">
                  {format(new Date(w.created_at), "MMM d, yyyy")}
                </TableCell>
              </TableRow>
            );
            })
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
