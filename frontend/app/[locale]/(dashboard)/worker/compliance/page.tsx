import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSession } from "@/lib/session";
import { getCompliances } from "@/features/profile/dal/queries";
import { CompliancesClient, type CompliancesRow } from "./_client";

export default async function WorkerCompliancePage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.role !== "worker") redirect("/app");

  const compliancesPromise: Promise<CompliancesRow[]> = getCompliances().then(
    (rows) =>
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        fileUrl: r.file_url,
        isVerified: r.is_verified,
        createdAt: r.created_at,
      })),
  );
  compliancesPromise.catch(() => undefined);

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      <Suspense fallback={<CompliancePageSkeleton />}>
        <CompliancesClient compliancesPromise={compliancesPromise} />
      </Suspense>
    </div>
  );
}

async function CompliancePageSkeleton() {
  const t = await getTranslations("dashboard.worker.compliance");
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("document")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("uploaded")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="ml-auto h-8 w-8 rounded-md" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
