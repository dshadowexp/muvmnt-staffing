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
import { AdminWorkerAuthorizationsFileOpen } from "@/features/admin/components/admin-worker-review-file-open";
import { getAdminAuthorizationReview } from "@/features/admin/dal/queries";
import { Link } from "@/i18n/navigation";
import { format } from "date-fns";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { normalizeProfessionId } from "@/lib/professions";

type PageProps = { params: Promise<{ authorizationId: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { authorizationId } = await params;
  const id = authorizationId;
  if (!id) return { title: "Authorization | Admin" };
  const data = await getAdminAuthorizationReview(id);
  if (!data) return { title: "Authorization | Admin" };
  return { title: `${data.authorization.type} | Authorization | Admin` };
}

export default async function AdminAuthorizationPage({ params }: PageProps) {
  const { authorizationId } = await params;
  const id = authorizationId;
  if (!id) notFound();

  const data = await getAdminAuthorizationReview(id);
  if (!data) notFound();

  const { authorization, worker } = data;
  const workerName = worker
    ? `${worker.first_name} ${worker.last_name}`.trim()
    : null;
  const locale = await getLocale();
  const tProf = await getTranslations({ locale, namespace: "professions" });
  const professionLabel = worker
    ? tProf(normalizeProfessionId(worker.profession))
    : "—";

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      <AdminDetailHeader
        backHref="/admin/authorization"
        backLabel="Back to authorization"
        eyebrow="Work authorization"
        title={authorization.type}
        meta={`Uploaded ${format(
          new Date(authorization.created_at),
          "MMM d, yyyy",
        )}`}
        actions={
          <Badge
            variant={authorization.is_verified ? "default" : "secondary"}
          >
            {authorization.is_verified ? "Verified" : "Unverified"}
          </Badge>
        }
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Authorization record</CardDescription>
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
            <AdminDetailRow label="Type" value={authorization.type} />
            <AdminDetailRow
              label="Social number"
              value={authorization.social_number ?? "—"}
            />
            <AdminDetailRow
              label="Social number expiry"
              value={
                authorization.social_number_expiry
                  ? format(
                      new Date(authorization.social_number_expiry),
                      "MMM d, yyyy",
                    )
                  : "—"
              }
            />
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
            <AdminWorkerAuthorizationsFileOpen
              workerId={worker.id}
              items={[
                {
                  id: authorization.id,
                  type: authorization.type,
                  file_url: authorization.file_url,
                  is_verified: authorization.is_verified,
                  created_at: authorization.created_at,
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
