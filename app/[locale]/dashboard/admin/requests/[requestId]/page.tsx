import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AdminDetailHeader,
  AdminDetailRow,
} from "@/features/admin/components/admin-detail-layout";
import { getAdminRequestReview } from "@/features/admin/dal/queries";
import { Link } from "@/i18n/navigation";
import { format } from "date-fns";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ requestId: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { requestId } = await params;
  const data = await getAdminRequestReview(requestId);
  if (!data) return { title: "Request | Admin" };
  return {
    title: `Request ${data.request.id.slice(0, 8)} | Admin`,
  };
}

function formatLocation(
  loc: Awaited<ReturnType<typeof getAdminRequestReview>> extends infer T
    ? T extends { location: infer L }
      ? L
      : never
    : never,
): string {
  if (!loc) return "—";
  const parts = [
    loc.address,
    loc.city,
    loc.admin_area,
    loc.postal_code,
    loc.country_code,
  ].filter((p): p is string => Boolean(p));
  return parts.join(", ");
}

function formatCents(cents: number | null, currency: string) {
  if (cents == null) return "—";
  try {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

export default async function AdminRequestPage({ params }: PageProps) {
  const { requestId } = await params;
  const data = await getAdminRequestReview(requestId);
  if (!data) notFound();

  const { request, client, location, shifts, payments } = data;

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <AdminDetailHeader
        backHref="/admin/requests"
        backLabel="Back to requests"
        eyebrow="Staff request"
        title={`Request #${request.id.slice(0, 8)}`}
        meta={`Created ${format(new Date(request.created_at), "MMM d, yyyy")}`}
        actions={
          <Badge variant="outline" className="text-muted-foreground">
            {request.status}
          </Badge>
        }
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Schedule, scope, and client</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3">
            <AdminDetailRow
              label="Client"
              value={
                client ? (
                  <Link
                    href={`/admin/clients/${client.id}`}
                    className="text-primary hover:underline"
                  >
                    {client.name}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <AdminDetailRow label="Positions" value={request.positions} />
            <AdminDetailRow
              label="Start"
              value={format(new Date(request.start_date), "MMM d, yyyy")}
            />
            <AdminDetailRow
              label="End"
              value={
                request.end_date
                  ? format(new Date(request.end_date), "MMM d, yyyy")
                  : "—"
              }
            />
            <AdminDetailRow
              label="Pricing"
              value={
                request.pricing_tier
                  ? `${request.pricing_tier} • ${
                      request.pricing_rate ? `$${request.pricing_rate}/hr` : "—"
                    }`
                  : "—"
              }
            />
            <AdminDetailRow label="Location" value={formatLocation(location)} />
            {request.notes ? (
              <AdminDetailRow label="Notes" value={request.notes} />
            ) : null}
            {request.requirements?.length ? (
              <AdminDetailRow
                label="Requirements"
                value={request.requirements.join(", ")}
              />
            ) : null}
            {request.tasks?.length ? (
              <AdminDetailRow
                label="Tasks"
                value={request.tasks.join(", ")}
              />
            ) : null}
          </dl>
        </CardContent>
      </Card>

      <Card size="sm" className="py-0">
        <CardHeader className="px-6 pt-6">
          <CardTitle>Shifts</CardTitle>
          <CardDescription>
            All shifts assigned to this request
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {shifts.length === 0 ? (
            <p className="text-muted-foreground px-6 pb-6 text-sm">
              No shifts assigned yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <Link
                        href={`/admin/shifts/${s.id}`}
                        className="text-primary hover:underline"
                      >
                        {s.worker_id.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(s.start_time), "MMM d, h:mm a")}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(s.end_time), "MMM d, h:mm a")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-muted-foreground"
                      >
                        {s.status ?? "Pending"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card size="sm" className="py-0">
        <CardHeader className="px-6 pt-6">
          <CardTitle>Payments</CardTitle>
          <CardDescription>Charges for this request</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {payments.length === 0 ? (
            <p className="text-muted-foreground px-6 pb-6 text-sm">
              No payments recorded.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(p.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {formatCents(p.amount_cents, p.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-muted-foreground"
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
