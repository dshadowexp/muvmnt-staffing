"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { CertificationsForm } from "@/features/profile/components/certifications-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CertificationIconMark } from "./certification-icon-mark";
import {
  FileTextIcon,
  ListChecksIcon,
  MessageSquareIcon,
  MicIcon,
  PlusIcon,
  SparklesIcon,
  VideoIcon,
} from "lucide-react";
import * as React from "react";

export type AssessmentCertificationRow = {
  id: number;
  name: string;
  file_url: string;
  is_verified: boolean;
};

type Props = {
  initialCertifications: AssessmentCertificationRow[];
  profession: string;
};

/** Hover: animate only `transform` (compositor) — border/gradient/shadow update without transition to avoid layout-heavy tweens. */
const interviewCardClassName =
  "h-full origin-center border-violet-500/25 bg-gradient-to-br from-violet-500/[0.07] via-transparent to-sky-500/[0.05] shadow-sm motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:group-hover:scale-[1.03] motion-safe:group-hover:-translate-y-1 group-hover:border-violet-500/45 group-hover:from-violet-500/[0.11] group-hover:shadow-md dark:border-violet-400/20 dark:from-violet-500/10 dark:group-hover:border-violet-400/35";

const credentialCardClassName =
  "h-full origin-center motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:scale-[1.03] motion-safe:hover:-translate-y-1 hover:border-border hover:bg-muted/20 hover:shadow-md";

function AiInterviewBadge() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        variant="outline"
        className="border-violet-500/40 bg-violet-500/10 font-normal text-violet-950 dark:border-violet-400/35 dark:bg-violet-500/15 dark:text-violet-100"
      >
        <MicIcon className="size-3.5" aria-hidden />
        AI voice
      </Badge>
      <Badge
        variant="outline"
        className="border-sky-500/40 bg-sky-500/10 font-normal text-sky-950 dark:border-sky-400/35 dark:bg-sky-500/15 dark:text-sky-100"
      >
        <VideoIcon className="size-3.5" aria-hidden />
        Video
      </Badge>
    </div>
  );
}

function CredentialAssessmentBadges() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        variant="outline"
        className="border-emerald-500/40 bg-emerald-500/10 font-normal text-emerald-950 dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-100"
      >
        <SparklesIcon className="size-3.5" aria-hidden />
        AI-guided
      </Badge>
      <Badge
        variant="outline"
        className="border-teal-500/40 bg-teal-500/10 font-normal text-teal-950 dark:border-teal-400/35 dark:bg-teal-500/15 dark:text-teal-100"
      >
        <ListChecksIcon className="size-3.5" aria-hidden />
        Multiple choice
      </Badge>
    </div>
  );
}

export function WorkerAssessmentsHub({
  initialCertifications,
  profession,
}: Props) {
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);

  function handleAddDialogChange(open: boolean) {
    setAddOpen(open);
    if (!open) router.refresh();
  }

  return (
    <>
      <div className="flex w-full flex-col gap-8">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Assessments</h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              One place for credentials and evaluations. Cards with{" "}
              <span className="font-medium text-foreground">AI voice</span> and{" "}
              <span className="font-medium text-foreground">Video</span> are live
              interviews with an AI interviewer. Certification and skill tiles use{" "}
              <span className="font-medium text-foreground">AI-guided</span>,{" "}
              <span className="font-medium text-foreground">multiple choice</span>{" "}
              assessments when a credential is not yet verified.
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            className="shrink-0"
            onClick={() => setAddOpen(true)}
          >
            <PlusIcon className="size-4" />
            Add certification or skill
          </Button>
        </div>

        <div className="grid gap-4 p-1 sm:grid-cols-2 xl:grid-cols-3">
          <Link
            href="/worker/assessments/interviews/profession"
            className="group block rounded-2xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className={cn("overflow-hidden", interviewCardClassName)}>
              <CardHeader className="gap-3">
                <AiInterviewBadge />
                <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-900 dark:bg-violet-400/15 dark:text-violet-50">
                  <MessageSquareIcon className="size-5" />
                </div>
                <CardTitle className="text-base">Profession interview</CardTitle>
                <CardDescription>
                  AI-led voice and video session about your role
                  {profession ? `: ${profession}` : ""}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-primary text-sm font-medium group-hover:underline">
                  Start interview →
                </span>
              </CardContent>
            </Card>
          </Link>

          <Link
            href="/worker/assessments/resume-interview"
            className="group block rounded-2xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className={cn("overflow-hidden", interviewCardClassName)}>
              <CardHeader className="gap-3">
                <AiInterviewBadge />
                <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-900 dark:bg-violet-400/15 dark:text-violet-50">
                  <FileTextIcon className="size-5" />
                </div>
                <CardTitle className="text-base">Resume interview</CardTitle>
                <CardDescription>
                  AI-led voice and video walkthrough of your resume and
                  experience.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-primary text-sm font-medium group-hover:underline">
                  Start interview →
                </span>
              </CardContent>
            </Card>
          </Link>

          {initialCertifications.length === 0 ? (
            <Card
              className={cn(
                "border-dashed sm:col-span-2 xl:col-span-1",
                credentialCardClassName,
              )}
            >
              <CardHeader className="gap-3">
                <CredentialAssessmentBadges />
                <CertificationIconMark />
                <CardTitle className="text-base">No certifications yet</CardTitle>
                <CardDescription>
                  Use &quot;Add certification or skill&quot; to upload documents.
                  They will appear here as tiles in this grid.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            initialCertifications.map((c) => (
              <Card
                key={c.id}
                size="sm"
                className={cn("flex flex-col", credentialCardClassName)}
              >
                <CardHeader className="gap-3 pb-2">
                  <CredentialAssessmentBadges />
                  <CertificationIconMark name={c.name} />
                  <CardTitle className="text-base leading-snug">{c.name}</CardTitle>
                  <CardDescription>Document on file</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-0">
                  {c.is_verified ? (
                    <Badge variant="secondary">Verified</Badge>
                  ) : (
                    <Button type="button" size="sm" asChild>
                      <Link
                        href={`/worker/assessments/quizes/start?certification=${encodeURIComponent(c.name)}`}
                      >
                        Begin assessment
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={handleAddDialogChange}>
        <DialogContent
          className="flex max-h-[min(90vh,720px)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
          showCloseButton
        >
          <DialogHeader className="border-border shrink-0 border-b px-6 py-4">
            <DialogTitle>Add certification or skill</DialogTitle>
            <DialogDescription>
              Upload a document for each credential. You can close this dialog
              when finished — your list on this page will update.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <CertificationsForm
              initialCertifications={initialCertifications.map((c) => ({
                name: c.name,
                file_url: c.file_url,
              }))}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
