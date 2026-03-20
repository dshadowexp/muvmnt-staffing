import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { format } from "date-fns";
import { formatCurrency, formatTime } from "@/lib/formatters";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { UserRole } from "@/types/auth";
import { getJobInfos } from "@/features/jobs/dal/queries";
import {
  ArrowRightIcon,
  CalendarIcon,
  ClockIcon,
  Loader2Icon,
  PlusIcon,
  UserIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AppPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen-header flex items-center justify-center">
          <Loader2Icon className="size-24 animate-spin" />
        </div>
      }
    >
      <JobInfos />
    </Suspense>
  );
}

async function JobInfos() {
  const { data: jobInfos, error: jobInfosError, message: jobInfosMessage } = await getJobInfos();
  if (jobInfosError) return <div>{jobInfosMessage}</div>;

  if (jobInfos == null || jobInfos.length === 0) return <NoJobs />;

  return (
    <div className="container my-4">
      <div className="flex gap-2 justify-between mb-6">
        <h2 className="text-xl md:text-2xl lg:text-3xl">
          Posted Jobs
        </h2>
        <Button asChild>
          <Link href="/app/job-infos/new">
            <PlusIcon />
            Create Job
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 has-hover:*:not-hover:opacity-70">
      {jobInfos.map((jobInfo) => (
        <Link
          className="hover:scale-[1.02] transition-[transform_opacity]"
          href={`/app/job-infos/${jobInfo.id}`}
          key={jobInfo.id}
        >
          <Card className="h-full transition-transform group-hover:shadow-md">
            <div className="flex h-full flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg leading-tight">
                      {jobInfo.title}
                    </CardTitle>
                    <p className="mt-1 text-sm font-medium text-primary">
                      {jobInfo.profession}
                    </p>
                  </div>
                  <ArrowRightIcon className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                {(jobInfo.notes ?? "").trim() ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {jobInfo.notes ?? "No notes"}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarIcon className="size-4 shrink-0" />
                    {format(new Date(jobInfo.start_date), "MMM d, yyyy")}
                    {jobInfo.end_date
                      ? ` – ${format(new Date(jobInfo.end_date), "MMM d, yyyy")}`
                      : " (ongoing)"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ClockIcon className="size-4 shrink-0" />
                    {formatTime(jobInfo.start_time)} – {formatTime(jobInfo.end_time)}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap items-center gap-2 border-t pt-4">
                <Badge variant="secondary" className="font-semibold">
                  {formatCurrency(jobInfo.hourly_rate)}
                  <span className="ml-0.5 font-normal text-muted-foreground">
                    /hr
                  </span>
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <UserIcon className="size-3" />
                  {jobInfo.positions} {jobInfo.positions === 1 ? "position" : "positions"}
                </Badge>
                {jobInfo.screening && (
                  <Badge variant="outline" className="border-primary/50 text-primary">
                    AI screening
                  </Badge>
                )}
              </CardFooter>
            </div>
          </Card>
        </Link>
      ))}
      <Link className="transition-opacity" href="/app/job-infos/new">
        <Card className="h-full flex items-center justify-center border-dashed border-3 bg-transparent hover:border-primary/50 transition-colors shadow-none">
          <div className="text-lg flex items-center gap-2">
            <PlusIcon className="size-6" />
            New Job
          </div>
        </Card>
      </Link>
      </div>
    </div>
  )
}


async function NoJobs() {
  const { user } = await getCurrentUser({ allData: true });

  const role = user?.role as UserRole;
  
  return (
    <div className="container my-4 max-w-5xl">
      <h1 className="text-3xl md:text-4xl lg:text-5xl mb-4">
        Welcome to Muvmnt
      </h1>
      <p className="text-muted-foreground mb-8">
        To get started, enter information about the type of job you are wanting
        to apply for. This can be specific information copied directly from a
        job listing or general information such as the tech stack you want to
        work in. The more specific you are in the description the closer the
        test interviews will be to the real thing.
      </p>
      {role === "client" && (
        <Link className="transition-opacity" href="/app/job-infos/new">
        <Card className="h-full flex items-center justify-center border-dashed border-3 bg-transparent hover:border-primary/50 transition-colors shadow-none">
          <div className="text-lg flex items-center gap-2">
            <PlusIcon className="size-6" />
            New Job Description
          </div>
        </Card>
      </Link>
      )}
      {role === 'worker' && 
        <div>
          <h1>No shifts</h1>
        </div>
      }
    </div>
  )
}