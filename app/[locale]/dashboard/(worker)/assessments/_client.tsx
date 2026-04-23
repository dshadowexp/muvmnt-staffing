"use client";

import { Suspense, use } from "react";
import { Link, useRouter } from "@/i18n/navigation";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  CheckCircleIcon,
  ClockIcon,
  ListChecksIcon,
  MicIcon,
  PlusIcon,
  SparklesIcon,
  VideoIcon,
  XCircleIcon,
  CircleDashedIcon,
} from "lucide-react";
import { formatDateTime } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import * as React from "react";
import { SkillsForm } from "@/features/profile/components/skills-form";
import { parseInterviewFeedback } from "@/features/interviews/lib/interview-feedback-json";
import type { Database } from "@/services/supabase/types/database";

export type AssessmentSkillRow = {
  id: string;
  name: string;
  assessed: boolean;
  /** Most recently completed quiz for this skill, if any. */
  latestQuiz: {
    passed: boolean;
    score: number | null;
    completedAt: string;
  } | null;
};

export type StartedInterview = {
  id: string;
  subject: "profession" | "resume";
  feedback: Database["public"]["Tables"]["interviews"]["Row"]["feedback"];
  duration: string | null;
  completedAt: string | null;
  reviewed: boolean;
};

type Props = {
  profession: string;
  professionInterviewPromise: Promise<StartedInterview | null>;
  resumeInterviewPromise: Promise<StartedInterview | null>;
  skillsPromise: Promise<AssessmentSkillRow[]>;
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
        AI
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
  profession,
  professionInterviewPromise,
  resumeInterviewPromise,
  skillsPromise,
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
              Complete assessments to boost your profile and get selected for shifts faster.
            </p>
          </div>
          {/* <Button
            type="button"
            size="lg"
            className="text-muted-foreground hover:text-foreground inline-flex w-fit shrink-0 items-center gap-2 rounded-lg border border-dashed border-border bg-muted/15 px-3 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-muted/30"
            onClick={() => setAddOpen(true)}
          >
            <PlusIcon className="size-4" />
            Add skill
          </Button> */}
        </div>

        <div className="grid gap-4 p-1 sm:grid-cols-2 xl:grid-cols-3">
          <Suspense fallback={<InterviewCardSkeleton variant="start" />}>
            <InterviewSlot
              type="profession"
              profession={profession}
              promise={professionInterviewPromise}
            />
          </Suspense>

          <Suspense fallback={<InterviewCardSkeleton variant="start" />}>
            <InterviewSlot type="resume" promise={resumeInterviewPromise} />
          </Suspense>

          {/* <Suspense fallback={<SkillsGridSkeleton />}>
            <SkillsGridSlot promise={skillsPromise} setAddOpen={setAddOpen} />
          </Suspense> */}
        </div>
      </div>

      {/* <Dialog open={addOpen} onOpenChange={handleAddDialogChange}>
        <DialogContent
          className="flex max-h-[min(90vh,720px)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
          showCloseButton
        >
          <DialogHeader className="border-border shrink-0 border-b px-6 py-4">
            <DialogTitle>Add skill</DialogTitle>
            <DialogDescription>
              Select a skill you want to add to your profile. You&apos;ll verify
              it by taking a short quiz.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <React.Suspense fallback={<AddSkillsFormSkeleton />}>
              <AddSkillsFormSlot
                promise={skillsPromise}
                onSaved={() => handleAddDialogChange(false)}
              />
            </React.Suspense>
          </div>
        </DialogContent>
      </Dialog> */}
    </>
  );
}

// ---------------------------------------------------------------------------
// Interview slot
// ---------------------------------------------------------------------------

function InterviewSlot({
  type,
  profession,
  promise,
}: {
  type: "profession" | "resume";
  profession?: string;
  promise: Promise<StartedInterview | null>;
}) {
  const interview = use(promise);

  const title =
    type === "profession" ? "Profession interview" : "Resume interview";

  if (interview?.completedAt == null) {
    const href =
      type === "profession" ? "/interviews/profession" : "/interviews/resume";
    const description =
      type === "profession"
        ? `AI-led voice and video session about general health knowledge and professional competencies.`
        : "AI-led voice and video walkthrough of your resume and experience.";
    return (
      <Link
        href={href}
        className="group block rounded-2xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Card className={cn("overflow-hidden", interviewCardClassName)}>
          <CardHeader className="gap-3">
            <AiInterviewBadge />
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-primary text-sm font-medium group-hover:underline">
              Start interview →
            </span>
          </CardContent>
        </Card>
      </Link>
    );
  }

  const parsedFeedback = parseInterviewFeedback(interview.feedback);
  const decision: "PASS" | "FAIL" | "PENDING" =
    parsedFeedback?.decision ?? "PENDING";

  const description = !interview.reviewed ? "Your interview feedback is under review." :
    decision === "PENDING"
      ? type === "profession"
        ? `Your ${profession} interview is complete — feedback is being prepared.`
        : "Your resume interview is complete — feedback is being prepared."
      : decision === "PASS"
        ? type === "profession"
          ? `You passed your ${profession} interview.`
          : "You passed your resume interview."
        : type === "profession"
          ? `Your ${profession} interview did not meet the bar.`
          : "Your resume interview did not meet the bar.";

  return (
    <Link
      href={`/interviews/${interview.id}`}
      className="group block rounded-2xl text-left outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CompletedInterviewCard
        title={title}
        description={description}
        duration={interview.duration}
        decision={decision}
        reviewed={interview.reviewed}
      />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Skills grid slot
// ---------------------------------------------------------------------------

function SkillsGridSlot({
  promise,
  setAddOpen,
}: {
  promise: Promise<AssessmentSkillRow[]>;
  setAddOpen: (open: boolean) => void;
}) {
  const skills = React.use(promise);
  const [quizDialog, setQuizDialog] =
    React.useState<AssessmentSkillRow | null>(null);

  if (skills.length === 0) {
    return (
      <Card
        className={cn(
          "border-dashed sm:col-span-2 xl:col-span-1",
          credentialCardClassName,
        )}
        onClick={() => setAddOpen(true)}
      >
        <CardHeader className="gap-3">
          <CardTitle className="text-base">No skills yet</CardTitle>
          <CardDescription>
            Use &quot;Add skill&quot; to claim a skill and verify it with a short
            quiz.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      {skills.map((s) => {
        const state = skillCardState(s);
        if (state === "not_taken") {
          return (
            <Link
              key={s.id}
              href={`/quizes/${s.id}`}
              className="group block rounded-2xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card
                size="sm"
                className={cn("flex h-full flex-col", credentialCardClassName)}
              >
                <CardHeader className="gap-3 pb-2">
                  <CredentialAssessmentBadges />
                  <CardTitle className="text-base leading-snug">
                    {s.name}
                  </CardTitle>
                  <CardDescription>
                    Timed multiple-choice assessment tailored to this skill.
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto pt-0">
                  <span className="text-primary text-sm font-medium group-hover:underline">
                    Begin assessment →
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        }

        return (
          <button
            key={s.id}
            type="button"
            onClick={() => setQuizDialog(s)}
            className="group block rounded-2xl text-left outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CompletedSkillCard skill={s} state={state} />
          </button>
        );
      })}

      <Dialog
        open={quizDialog != null}
        onOpenChange={(open) => {
          if (!open) setQuizDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          {quizDialog && <SkillQuizStatusDialogBody skill={quizDialog} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddSkillsFormSlot({
  promise,
  onSaved,
}: {
  promise: Promise<AssessmentSkillRow[]>;
  onSaved: () => void;
}) {
  const skills = React.use(promise);
  return (
    <SkillsForm
      initialSkills={skills.map((s) => ({ name: s.name }))}
      onSaved={onSaved}
    />
  );
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function InterviewCardSkeleton({
  variant,
}: {
  variant: "start" | "completed";
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden",
        variant === "start" ? interviewCardClassName : credentialCardClassName,
      )}
    >
      <CardHeader className="gap-3">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-28" />
      </CardContent>
    </Card>
  );
}

function SkillCardSkeleton() {
  return (
    <Card size="sm" className={cn("flex h-full flex-col", credentialCardClassName)}>
      <CardHeader className="gap-3 pb-2">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </CardHeader>
      <CardContent className="mt-auto pt-0">
        <Skeleton className="h-4 w-32" />
      </CardContent>
    </Card>
  );
}

function SkillsGridSkeleton() {
  // The grid column reserves one slot; emit a single placeholder so the grid
  // feels populated while we stream in the real list.
  return (
    <>
      <SkillCardSkeleton />
    </>
  );
}

function AddSkillsFormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-10 w-36" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared card helpers
// ---------------------------------------------------------------------------

type SkillCardState = "not_taken" | "failed" | "passed";

function skillCardState(s: AssessmentSkillRow): SkillCardState {
  if (s.latestQuiz?.passed === true) return "passed";
  if (s.latestQuiz?.passed === false) return "failed";
  if (s.assessed) return "passed";
  return "not_taken";
}

function CompletedSkillCard({
  skill: s,
  state,
}: {
  skill: AssessmentSkillRow;
  state: Exclude<SkillCardState, "not_taken">;
}) {
  const isPassed = state === "passed";
  const score = s.latestQuiz?.score ?? null;

  return (
    <Card
      size="sm"
      className={cn(
        "flex h-full flex-col overflow-hidden shadow-sm motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:group-hover:scale-[1.03] motion-safe:group-hover:-translate-y-1",
        isPassed
          ? "border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.06] via-transparent to-sky-500/[0.04] group-hover:border-emerald-500/40 group-hover:shadow-md dark:border-emerald-400/20 dark:from-emerald-500/10 dark:group-hover:border-emerald-400/35"
          : "border-destructive/25 bg-gradient-to-br from-destructive/[0.06] via-transparent to-orange-500/[0.04] group-hover:border-destructive/40 group-hover:shadow-md",
      )}
    >
      <CardHeader className="gap-3 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          {isPassed ? (
            <Badge
              variant="outline"
              className="border-emerald-500/40 bg-emerald-500/10 font-normal text-emerald-950 dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-100"
            >
              <CheckCircleIcon className="size-3.5" aria-hidden />
              {s.latestQuiz ? `Passed · ${score ?? "—"}%` : "Assessed"}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-destructive/40 bg-destructive/10 font-normal text-destructive"
            >
              Needs retake{s.latestQuiz ? ` · ${score ?? "—"}%` : ""}
            </Badge>
          )}
        </div>
        <CardTitle className="text-base leading-snug">{s.name}</CardTitle>
        <CardDescription>
          {isPassed
            ? "Assessment complete."
            : "Last attempt did not meet the 70% pass mark."}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto pt-0">
        <span className="text-primary text-sm font-medium group-hover:underline">
          View details →
        </span>
      </CardContent>
    </Card>
  );
}

function SkillQuizStatusDialogBody({ skill: s }: { skill: AssessmentSkillRow }) {
  const state = skillCardState(s);
  const passed = state === "passed";
  const failed = state === "failed";

  return (
    <>
      <DialogHeader>
        <DialogTitle>Assessment — {s.name}</DialogTitle>
        <DialogDescription>
          Multiple-choice quiz tailored to this skill.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        {passed && (
          <div className="space-y-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
              <CheckCircleIcon className="size-5 shrink-0" aria-hidden />
              <span className="font-medium">Passed</span>
            </div>
            {s.latestQuiz && (
              <p className="text-sm text-muted-foreground">
                Score:{" "}
                <span className="font-medium text-foreground">
                  {s.latestQuiz.score ?? "—"}%
                </span>
                {s.latestQuiz.completedAt && (
                  <>
                    {" "}
                    · Completed{" "}
                    {formatDateTime(new Date(s.latestQuiz.completedAt))}
                  </>
                )}
              </p>
            )}
            {!s.latestQuiz && s.assessed && (
              <p className="text-sm text-muted-foreground">
                This skill is marked as assessed on your profile.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              You met the 70% requirement. No need to retake this assessment.
            </p>
          </div>
        )}

        {failed && s.latestQuiz && (
          <div className="space-y-2 rounded-lg border border-destructive/25 bg-destructive/5 p-4">
            <p className="font-medium text-destructive">Not passed</p>
            <p className="text-sm text-muted-foreground">
              Your last score was{" "}
              <span className="font-medium text-foreground">
                {s.latestQuiz.score ?? "—"}%
              </span>
              . You need 70% to pass and verify this skill.
            </p>
            {s.latestQuiz.completedAt && (
              <p className="text-xs text-muted-foreground">
                Attempt: {formatDateTime(new Date(s.latestQuiz.completedAt))}
              </p>
            )}
          </div>
        )}
      </div>
      <DialogFooter className="gap-2 sm:gap-0">
        {failed && (
          <Button type="button" asChild>
            <Link href={`/quizes/${s.id}`}>Retake assessment</Link>
          </Button>
        )}
      </DialogFooter>
    </>
  );
}

function CompletedInterviewCard({
  title,
  description,
  duration,
  decision,
  reviewed
}: {
  title: string;
  description: string;
  duration: string | null;
  decision: "PASS" | "FAIL" | "PENDING";
  reviewed: boolean;
}) {
  const cardTone = !reviewed ? "border-muted/25 bg-muted/10 group-hover:border-muted/40" :
    decision === "PASS"
      ? "border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.06] via-transparent to-sky-500/[0.04] group-hover:border-emerald-500/40 dark:border-emerald-400/20 dark:from-emerald-500/10 dark:group-hover:border-emerald-400/35"
      : decision === "FAIL"
        ? "border-destructive/25 bg-gradient-to-br from-destructive/[0.06] via-transparent to-orange-500/[0.04] group-hover:border-destructive/40"
        : "border-violet-500/25 bg-gradient-to-br from-violet-500/[0.06] via-transparent to-sky-500/[0.04] group-hover:border-violet-500/40 dark:border-violet-400/20 dark:from-violet-500/10 dark:group-hover:border-violet-400/35";

  const cta =
    decision === "PENDING" ? "Generate feedback →" : "View feedback →";

  return (
    <Card
      className={cn(
        "h-full overflow-hidden shadow-sm",
        "motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]",
        "motion-safe:group-hover:scale-[1.03] motion-safe:group-hover:-translate-y-1",
        "group-hover:shadow-md",
        cardTone,
      )}
    >
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <DecisionBadge decision={decision} reviewed={reviewed} />
          {duration && (
            <Badge variant="outline" className="font-normal text-muted-foreground">
              <ClockIcon className="size-3" aria-hidden />
              {duration}
            </Badge>
          )}
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <span className="text-primary text-sm font-medium group-hover:underline">
          {cta}
        </span>
      </CardContent>
    </Card>
  );
}

function DecisionBadge({
  reviewed,
  decision,
}: {
  decision: "PASS" | "FAIL" | "PENDING";
  reviewed: boolean;
}) {
  if (!reviewed) {
    return (
      <Badge
        variant="outline"
        className="border-violet-500/40 bg-violet-500/10 font-normal text-violet-950 dark:border-violet-400/35 dark:bg-violet-500/15 dark:text-violet-100"
      >
        <CircleDashedIcon className="size-3.5 animate-spin" aria-hidden />
        Under review
      </Badge>
    );
  }

  if (decision === "PASS") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/40 bg-emerald-500/10 font-normal text-emerald-950 dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-100"
      >
        <CheckCircleIcon className="size-3.5" aria-hidden />
        Passed
      </Badge>
    );
  }

  if (decision === "FAIL") {
    return (
      <Badge
        variant="outline"
        className="border-destructive/40 bg-destructive/10 font-normal text-destructive"
      >
        <XCircleIcon className="size-3.5" aria-hidden />
        Failed
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="border-violet-500/40 bg-violet-500/10 font-normal text-violet-950 dark:border-violet-400/35 dark:bg-violet-500/15 dark:text-violet-100"
    >
      <CircleDashedIcon className="size-3.5 animate-spin" aria-hidden />
      Awaiting feedback
    </Badge>
  );
}
