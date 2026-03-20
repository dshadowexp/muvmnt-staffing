import { BackLink } from "@/components/back-link";
import { SuspendedItem } from "@/components/suspended-item";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getJobInfo } from "@/features/jobs/dal/queries";
import { formatCurrency, formatTime } from "@/lib/formatters";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import type { UserRole } from "@/types/auth";
import { format } from "date-fns";
import {
  ArchiveIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckCircle2Icon,
  DollarSignIcon,
  ListChecksIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const clientOptions = [
  {
    label: "View Shifts",
    description: "View the shifts for this job.",
    href: "shifts",
  },
  {
    label: "Review Interviews",
    description: "Review the interviews for this job.",
    href: "interviews",
  },
  {
    label: "Update Job Details",
    description: "This should only be used for minor updates.",
    href: "edit",
  },
  {
    label: "Archive Job",
    description: "Archive the job and hide it from the public.",
    href: null,
  },
];

const workerOptions = [
  {
    label: "Refine Your Resume",
    description:
      "Get expert feedback on your resume and improve your chances of landing the job.",
    href: "resume",
  },
  {
    label: "Complete Interview with AI",
    description:
      "Complete a real interview with AI-powered mock interviews.",
    href: "interviews",
  },
];

type JobInfo = Awaited<
  ReturnType<typeof getJobInfo>
>["data"];

export default async function JobInfoPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId: id } = await params;

  const jobData = getCurrentUser().then(async ({ user }) => {
    const { error, data: jobInfo } = await getJobInfo(id);
    if (error || jobInfo == null) notFound();
    const role = (user?.role ?? "client") as UserRole;
    const options = role === "worker" ? workerOptions : clientOptions;
    return { jobInfo, options };
  });

  return (
    <div className="container my-4 max-w-4xl space-y-6">
      <BackLink backHref="/app" title="Jobs" />

      <SuspendedItem
        item={jobData}
        fallback={<JobDetailSkeleton />}
        result={({ jobInfo, options }) => (
          <JobDetailContent jobInfo={jobInfo} options={options} jobId={id} />
        )}
      />
    </div>
  );
}

function JobDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-48" />
    </div>
  );
}

function JobDetailContent({
  jobInfo,
  options,
  jobId,
}: {
  jobInfo: NonNullable<JobInfo>;
  options: typeof clientOptions;
  jobId: string;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {jobInfo.title}
            </h1>
            <p className="mt-1 text-base font-medium text-primary">
              {jobInfo.profession}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1 font-semibold">
            <DollarSignIcon className="size-3.5" />
            {formatCurrency(jobInfo.hourly_rate)}
            <span className="ml-0.5 font-normal text-muted-foreground">/hr</span>
          </Badge>
          <Badge variant="outline" className="gap-1">
            <UserIcon className="size-3.5" />
            {jobInfo.positions}{" "}
            {jobInfo.positions === 1 ? "position" : "positions"}
          </Badge>
          {jobInfo.screening && (
            <Badge variant="outline" className="border-primary/50 text-primary">
              AI screening
            </Badge>
          )}
        </div>
      </header>

      {/* Collapsible Job Details */}
      <Accordion type="multiple" className="w-full" defaultValue={["schedule", "requirements"]}>
        <AccordionItem value="schedule">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-2">
              <CalendarIcon className="size-4 shrink-0" />
              Schedule
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Dates:</span>
                <span>
                  {format(new Date(jobInfo.start_date), "MMM d, yyyy")}
                  {jobInfo.end_date
                    ? ` – ${format(new Date(jobInfo.end_date), "MMM d, yyyy")}`
                    : " (ongoing)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Time:</span>
                <span>
                  {formatTime(jobInfo.start_time)} – {formatTime(jobInfo.end_time)}
                </span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {jobInfo.requirements.length > 0 && (
          <AccordionItem value="requirements">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <span className="flex items-center gap-2">
                <ListChecksIcon className="size-4 shrink-0" />
                Requirements
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <p className="mb-2 text-xs text-muted-foreground">
                Credentials and qualifications needed for this role
              </p>
              <ul className="flex flex-wrap gap-2">
                {jobInfo.requirements.map((req) => (
                  <li key={req}>
                    <Badge variant="secondary" className="font-normal">
                      {req}
                    </Badge>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        )}

        {jobInfo.tasks.length > 0 && (
          <AccordionItem value="tasks">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <span className="flex items-center gap-2">
                <CheckCircle2Icon className="size-4 shrink-0" />
                Tasks & Responsibilities
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <p className="mb-3 text-xs text-muted-foreground">
                Day-to-day duties for this position
              </p>
              <ul className="space-y-2">
                {jobInfo.tasks.map((task, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        )}

        {(jobInfo.notes ?? "").trim() && (
          <AccordionItem value="notes">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              Additional Notes
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {jobInfo.notes}
              </p>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      <Separator />

      {/* Action Cards */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {options
            .filter((o): o is typeof o & { href: string } => o.href != null)
            .map((option) => (
            <Link
              className="group block transition-opacity hover:opacity-90"
              href={`/app/job-infos/${jobId}/${option.href}`}
              key={option.href}
            >
              <Card className="h-full transition-shadow group-hover:shadow-md">
                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">{option.label}</CardTitle>
                    <CardDescription className="mt-1">
                      {option.description}
                    </CardDescription>
                  </div>
                  <ArrowRightIcon className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

