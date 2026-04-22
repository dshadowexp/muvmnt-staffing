import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getAdminWorkerReview } from "@/features/admin/dal/queries";
import { AdminWorkerAccountActiveEditor } from "@/features/admin/components/admin-worker-account-active-editor";
import { AdminWorkerStatusEditor } from "@/features/admin/components/admin-worker-status-editor";
import {
  AdminWorkerAuthorizationsFileOpen,
  AdminWorkerCompliancesFileOpen,
  AdminWorkerProfilePhotoOpen,
} from "@/features/admin/components/admin-worker-review-file-open";
import { Link } from "@/i18n/navigation";
import { format } from "date-fns";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { normalizeProfessionId } from "@/lib/professions";

function boolLabel(v: boolean | null | undefined) {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "—";
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[minmax(8rem,12rem)_1fr] sm:gap-4">
      <dt className="text-muted-foreground text-sm font-medium">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

type PageProps = { params: Promise<{ workerId: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { workerId } = await params;
  const data = await getAdminWorkerReview(workerId);
  if (!data) return { title: "Worker | Admin" };
  return {
    title: `${data.worker.first_name} ${data.worker.last_name} | Admin`,
  };
}

export default async function AdminWorkerReviewPage({ params }: PageProps) {
  const { workerId } = await params;
  const data = await getAdminWorkerReview(workerId);
  if (!data) notFound();

  const { worker, user, compliances, authorizations, payroll } = data;
  const locale = await getLocale();
  const tProf = await getTranslations({ locale, namespace: "professions" });
  const professionLabel = tProf(normalizeProfessionId(worker.profession));

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/workers">← Back to workers</Link>
        </Button>
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          {worker.first_name} {worker.last_name}
        </h2>
        <p className="text-muted-foreground text-sm">
          User ID:{" "}
          <span className="font-mono text-xs">{worker.user_id}</span>
        </p>
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Worker record and account contact</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <dl className="space-y-3">
            <DetailRow label="Profession" value={professionLabel} />
            <DetailRow
              label="Status"
              value={
                <AdminWorkerStatusEditor
                  workerId={worker.id}
                  workerName={`${worker.first_name} ${worker.last_name}`}
                  initialStatus={worker.live ? "active" : "inactive"}
                />
              }
            />
            <DetailRow label="Live" value={boolLabel(worker.live)} />
            <DetailRow
              label="Date of birth"
              value={format(new Date(worker.date_of_birth), "MMM d, yyyy")}
            />
            <DetailRow label="Gender" value={worker.gender || "—"} />
            <DetailRow
              label="Years experience"
              value={worker.years_exp}
            />
            <Separator />
            <DetailRow
              label="Email"
              value={user?.email ?? "—"}
            />
            <DetailRow
              label="Phone"
              value={user?.phone_number ?? "—"}
            />
            <DetailRow
              label="Email verified"
              value={boolLabel(user?.is_email_verified)}
            />
            <DetailRow
              label="Phone verified"
              value={boolLabel(user?.is_phone_verified)}
            />
            <DetailRow
              label="Account active"
              value={
                <AdminWorkerAccountActiveEditor
                  workerId={worker.id}
                  workerName={`${worker.first_name} ${worker.last_name}`}
                  userId={worker.user_id}
                  initialAccountActive={user?.is_active}
                />
              }
            />
            {worker.photo_url ? (
              <DetailRow
                label="Photo"
                value={
                  <AdminWorkerProfilePhotoOpen
                    workerId={worker.id}
                    photoUrl={worker.photo_url}
                    workerName={`${worker.first_name} ${worker.last_name}`}
                    workerCreatedAt={worker.created_at}
                  />
                }
              />
            ) : null}
          </dl>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Work authorization</CardTitle>
          <CardDescription>Uploaded authorization documents</CardDescription>
        </CardHeader>
        <CardContent>
          {authorizations.length === 0 ? (
            <p className="text-muted-foreground text-sm">None on file.</p>
          ) : (
            <AdminWorkerAuthorizationsFileOpen
              workerId={worker.id}
              items={authorizations}
            />
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Compliance documents</CardTitle>
          <CardDescription>Uploaded compliance credentials</CardDescription>
        </CardHeader>
        <CardContent>
          {compliances.length === 0 ? (
            <p className="text-muted-foreground text-sm">None on file.</p>
          ) : (
            <AdminWorkerCompliancesFileOpen
              workerId={worker.id}
              items={compliances.map((c) => ({
                id: c.id,
                name: c.name,
                file_url: c.file_url ?? "",
                is_verified: c.is_verified,
                created_at: c.created_at,
              }))}
            />
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Payroll</CardTitle>
          <CardDescription>Stripe Connect payroll account</CardDescription>
        </CardHeader>
        <CardContent>
          {!payroll ? (
            <p className="text-muted-foreground text-sm">
              No payroll account on file.
            </p>
          ) : (
            <dl className="space-y-3">
              <DetailRow
                label="Stripe account"
                value={
                  <span className="font-mono text-xs break-all">
                    {payroll.stripe_account_id}
                  </span>
                }
              />
              <DetailRow
                label="Payouts enabled"
                value={boolLabel(payroll.payouts_enabled)}
              />
              <DetailRow
                label="Charges enabled"
                value={boolLabel(payroll.charges_enabled)}
              />
              <DetailRow
                label="Details submitted"
                value={boolLabel(payroll.details_submitted)}
              />
              <DetailRow
                label="Created"
                value={format(new Date(payroll.created_at), "MMM d, yyyy")}
              />
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
