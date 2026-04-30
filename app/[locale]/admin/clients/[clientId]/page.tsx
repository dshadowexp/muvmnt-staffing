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
import { getAdminClientReview } from "@/features/admin/dal/queries";
import { format } from "date-fns";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ clientId: string }> };

function boolLabel(v: boolean | null | undefined) {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "—";
}

function formatLocation(
  loc: Awaited<ReturnType<typeof getAdminClientReview>> extends infer T
    ? T extends { location: infer L }
      ? L
      : never
    : never,
): string {
  if (!loc) return "—";
  const parts = [
    loc.address_line_1,
    loc.address_line_2,
    loc.city,
    loc.admin_area,
    loc.postal_code,
    loc.country_code,
  ].filter((p): p is string => Boolean(p));
  if (parts.length === 0 && loc.address) return loc.address;
  return parts.join(", ");
}

function formatBalance(cents: number): string {
  try {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { clientId } = await params;
  const data = await getAdminClientReview(clientId);
  if (!data) return { title: "Client | Admin" };
  return { title: `${data.client.name} | Admin` };
}

export default async function AdminClientReviewPage({ params }: PageProps) {
  const { clientId } = await params;
  const data = await getAdminClientReview(clientId);
  if (!data) notFound();

  const { client, user, location, totals } = data;

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <AdminDetailHeader
        backHref="/admin/clients"
        backLabel="Back to clients"
        eyebrow="Client"
        title={client.name}
        meta={`Joined ${format(new Date(client.created_at), "MMM d, yyyy")}`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription className="text-xs uppercase tracking-wide">
              Requests
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {totals.requestsCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription className="text-xs uppercase tracking-wide">
              Shifts
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {totals.shiftsCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription className="text-xs uppercase tracking-wide">
              Paid
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatBalance(totals.paidCents)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Organization and contact</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <dl className="space-y-3">
            <AdminDetailRow label="Name" value={client.name} />
            <AdminDetailRow label="Type" value={client.type} />
            <AdminDetailRow label="Address" value={formatLocation(location)} />

            <Separator />

            <AdminDetailRow label="Email" value={user?.email ?? "—"} />
            <AdminDetailRow label="Phone" value={user?.phone_number ?? "—"} />
            <AdminDetailRow
              label="Email verified"
              value={boolLabel(user?.is_email_verified)}
            />
            <AdminDetailRow
              label="Phone verified"
              value={boolLabel(user?.is_phone_verified)}
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
