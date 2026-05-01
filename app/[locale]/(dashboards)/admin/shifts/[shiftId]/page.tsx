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
import { getAdminShiftReview } from "@/features/admin/dal/queries";
import { Link } from "@/i18n/navigation";
import { format } from "date-fns";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ shiftId: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { shiftId } = await params;
  const data = await getAdminShiftReview(shiftId);
  if (!data) return { title: "Shift | Admin" };
  return { title: `Shift ${data.shift.id.slice(0, 8)} | Admin` };
}

export default async function AdminShiftPage({ params }: PageProps) {
  const { shiftId } = await params;
  const data = await getAdminShiftReview(shiftId);
  if (!data) notFound();

  const { shift, facility, worker, request } = data;
  const workerName = worker
    ? `${worker.first_name} ${worker.last_name}`.trim()
    : null;

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <AdminDetailHeader
        backHref="/admin/shifts"
        backLabel="Back to shifts"
        eyebrow="Shift"
        title={`Shift #${shift.id.slice(0, 8)}`}
        meta={`Created ${format(new Date(shift.created_at), "MMM d, yyyy")}`}
        actions={
          <Badge variant="outline" className="text-muted-foreground">
            {shift.status ?? "Pending"}
          </Badge>
        }
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
          <CardDescription>Planned and recorded times</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3">
            <AdminDetailRow
              label="Start"
              value={format(new Date(shift.start_time), "MMM d, yyyy h:mm a")}
            />
            <AdminDetailRow
              label="End"
              value={format(new Date(shift.end_time), "MMM d, yyyy h:mm a")}
            />
            <AdminDetailRow
              label="Confirmed"
              value={
                shift.confirm_time
                  ? format(new Date(shift.confirm_time), "MMM d, h:mm a")
                  : "—"
              }
            />
            <AdminDetailRow
              label="Check-in"
              value={
                shift.checkin_time
                  ? format(new Date(shift.checkin_time), "MMM d, h:mm a")
                  : "—"
              }
            />
            <AdminDetailRow
              label="Check-out"
              value={
                shift.checkout_time
                  ? format(new Date(shift.checkout_time), "MMM d, h:mm a")
                  : "—"
              }
            />
            <AdminDetailRow
              label="Completed"
              value={
                shift.complete_time
                  ? format(new Date(shift.complete_time), "MMM d, h:mm a")
                  : "—"
              }
            />
            <AdminDetailRow
              label="Hourly rate"
              value={
                shift.hourly_rate != null ? `$${shift.hourly_rate}` : "—"
              }
            />
          </dl>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Parties</CardTitle>
          <CardDescription>Worker, facility and source request</CardDescription>
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
            <AdminDetailRow
              label="Request"
              value={
                request ? (
                  <Link
                    href={`/admin/requests/${request.id}`}
                    className="text-primary hover:underline"
                  >
                    Request #{request.id.slice(0, 8)}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
