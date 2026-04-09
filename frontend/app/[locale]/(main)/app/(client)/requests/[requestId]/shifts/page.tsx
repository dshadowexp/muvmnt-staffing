import { BackLink } from "@/components/back-link";
import { SuspendedItem } from "@/components/suspended-item";
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
import { Skeleton } from "@/components/ui/skeleton";
import { getStaffRequest } from "@/features/requests/dal/queries";
import { formatCurrency, formatJobHourlyRateLine, formatTime } from "@/lib/formatters";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { format, addDays } from "date-fns";
import { notFound } from "next/navigation";

type JobInfo = Awaited<ReturnType<typeof getStaffRequest>>["data"];

/** Simulated shift for demo - replace with real data when shifts table exists */
function getSimulatedShifts(
  jobInfo: NonNullable<JobInfo>,
  count: number
): Array<{
  date: string;
  startTime: string;
  endTime: string;
  worker: string;
  hours: number;
  rate: number;
  total: number;
  status: "completed" | "scheduled" | "open";
}> {
  const start = new Date(jobInfo.start_date);
  const rate = jobInfo.hourly_rate ?? 0;
  const workers = ["Sarah Chen", "Marcus Johnson", "Elena Rivera", "—", "—"];
  const statuses: Array<"completed" | "scheduled" | "open"> = [
    "completed",
    "completed",
    "scheduled",
    "scheduled",
    "open",
  ];

  return Array.from({ length: count }, (_, i) => {
    const date = addDays(start, i);
    const hours = [8, 10, 8, 12, 8, 10, 8, 8, 10, 8][i % 10];
    const total = hours * rate;
    return {
      date: format(date, "MMM d, yyyy"),
      startTime: jobInfo.start_time,
      endTime: jobInfo.end_time,
      worker: workers[i % workers.length],
      hours,
      rate,
      total,
      status: statuses[i % statuses.length],
    };
  });
}

export default async function ShiftsPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;

  const shiftsData = getCurrentUser().then(async ({ user }) => {
    if (!user) return null;
    const { error, data: staffRequest } = await getStaffRequest(requestId);
    if (error || !staffRequest) return null;
    const shifts = getSimulatedShifts(staffRequest, 10);
    return { staffRequest, shifts };
  });

  return (
    <div className="container my-4 max-w-4xl space-y-6">
      <BackLink backHref={`/app/requests/${requestId}`} title="Staff request" />

      <SuspendedItem
        item={shiftsData}
        fallback={<ShiftsSkeleton />}
        result={(data) => {
          if (!data) notFound();
          return (
            <ShiftsContent
              jobInfo={data.staffRequest}
              shifts={data.shifts}
              requestId={requestId}
            />
          );
        }}
      />
    </div>
  );
}

function ShiftsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ShiftsContent({
  jobInfo,
  shifts,
  requestId,
}: {
  jobInfo: NonNullable<JobInfo>;
  shifts: ReturnType<typeof getSimulatedShifts>;
  requestId: string;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Shifts</CardTitle>
                <CardDescription>
                    {jobInfo.profession} · {formatJobHourlyRateLine(jobInfo.hourly_rate)}
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Worker</TableHead>
                            <TableHead className="text-right">Hours</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {shifts.map((shift, i) => (
                            <TableRow key={i}>
                                <TableCell className="font-medium">{shift.date}</TableCell>
                                <TableCell>
                                    {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {shift.worker}
                                </TableCell>
                                <TableCell className="text-right">{shift.hours}h</TableCell>
                                <TableCell className="text-right">
                                    {formatCurrency(shift.rate)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {formatCurrency(shift.total)}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={
                                        shift.status === "completed"
                                            ? "default"
                                            : shift.status === "scheduled"
                                            ? "secondary"
                                            : "outline"
                                        }
                                    >
                                        {shift.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
