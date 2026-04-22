import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AdminDetailHeader,
  AdminDetailRow,
} from "@/features/admin/components/admin-detail-layout";
import { AdminWorkerCompliancesFileOpen } from "@/features/admin/components/admin-worker-review-file-open";
import { getAdminComplianceReview } from "@/features/admin/dal/queries";
import { Link } from "@/i18n/navigation";
import { format } from "date-fns";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { normalizeProfessionId } from "@/lib/professions";
import { complianceLabelEn } from "@/lib/labels-en";

type PageProps = { params: Promise<{ complianceId: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { complianceId } = await params;
  const data = await getAdminComplianceReview(complianceId);
  if (!data) return { title: "Compliance | Admin" };
  return {
    title: `${complianceLabelEn(data.compliance.name)} | Compliance | Admin`,
  };
}

export default async function AdminCompliancePage({ params }: PageProps) {
  const { complianceId } = await params;
  const data = await getAdminComplianceReview(complianceId);
  if (!data) notFound();

  const { compliance, worker } = data;
  const workerName = worker
    ? `${worker.first_name} ${worker.last_name}`.trim()
    : null;
  const locale = await getLocale();
  const tProf = await getTranslations({ locale, namespace: "professions" });
  const professionLabel = worker
    ? tProf(normalizeProfessionId(worker.profession))
    : "—";
  const complianceTitle = complianceLabelEn(compliance.name);

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      <AdminDetailHeader
        backHref="/admin/compliance"
        backLabel="Back to compliance"
        eyebrow="Compliance document"
        title={complianceTitle}
        meta={`Uploaded ${format(
          new Date(compliance.created_at),
          "MMM d, yyyy",
        )}`}
        actions={
          <Badge variant={compliance.is_verified ? "default" : "secondary"}>
            {compliance.is_verified ? "Verified" : "Unverified"}
          </Badge>
        }
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Compliance record</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3">
            <AdminDetailRow
              label="Worker"
              value={
                worker ? (
                  <Link
                    href={`/admin/workers/${worker.id}`}
                    className="text-primary hover:underline"
                  >
                    {workerName || worker.id.slice(0, 8)}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <AdminDetailRow label="Profession" value={professionLabel} />
            <AdminDetailRow label="Document" value={complianceTitle} />
          </dl>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Document</CardTitle>
          <CardDescription>Open the uploaded file</CardDescription>
        </CardHeader>
        <CardContent>
          {worker ? (
            <AdminWorkerCompliancesFileOpen
              workerId={worker.id}
              items={[
                {
                  id: compliance.id,
                  name: compliance.name,
                  file_url: compliance.file_url ?? "",
                  is_verified: compliance.is_verified,
                  created_at: compliance.created_at,
                },
              ]}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              Worker profile is not available; cannot preview file.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
