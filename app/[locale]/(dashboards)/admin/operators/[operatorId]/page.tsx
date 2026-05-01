import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AdminDetailHeader,
  AdminDetailRow,
} from "@/features/admin/components/admin-detail-layout";
import { getAdminOperatorReview } from "@/features/admin/dal/queries";
import { Link } from "@/i18n/navigation";
import { format } from "date-fns";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ operatorId: string }> };

function boolLabel(v: boolean | null | undefined) {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "—";
}

function displayName(data: NonNullable<Awaited<ReturnType<typeof getAdminOperatorReview>>>) {
  const { operator } = data;
  const n = `${operator.first_name ?? ""} ${operator.last_name ?? ""}`.trim();
  if (n) return n;
  return operator.email ?? data.user?.email ?? "Operator";
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { operatorId } = await params;
  const data = await getAdminOperatorReview(operatorId);
  if (!data) return { title: "Operator | Admin" };
  return { title: `${displayName(data)} | Admin` };
}

export default async function AdminOperatorReviewPage({ params }: PageProps) {
  const { operatorId } = await params;
  const data = await getAdminOperatorReview(operatorId);
  if (!data) notFound();

  const { operator, user, facility } = data;
  const title = displayName(data);

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <AdminDetailHeader
        backHref="/admin/operators"
        backLabel="Back to operators"
        eyebrow="Operator"
        title={title}
        meta={`Joined ${format(new Date(operator.created_at), "MMM d, yyyy")}`}
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle>Role</CardTitle>
          <CardDescription>Facility access and permission</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3">
            <AdminDetailRow label="Permission" value={operator.permission} />
            <AdminDetailRow
              label="Facility"
              value={
                facility ? (
                  <Link
                    href={`/admin/facilities/${facility.id}`}
                    className="text-primary hover:underline"
                  >
                    {facility.name}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            {facility ? (
              <AdminDetailRow label="Facility type" value={facility.type} />
            ) : null}
          </dl>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Operator profile and sign-in user</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <dl className="space-y-3">
            <AdminDetailRow
              label="Operator email"
              value={operator.email ?? "—"}
            />
            <AdminDetailRow label="User ID" value={operator.user_id} />

            <Separator />

            <AdminDetailRow label="Sign-in email" value={user?.email ?? "—"} />
            <AdminDetailRow label="Phone" value={user?.phone_number ?? "—"} />
            <AdminDetailRow
              label="Email verified"
              value={boolLabel(user?.is_email_verified)}
            />
            <AdminDetailRow
              label="Account active"
              value={boolLabel(user?.is_active)}
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
