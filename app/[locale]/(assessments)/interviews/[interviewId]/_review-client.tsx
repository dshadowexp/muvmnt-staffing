"use client";

import { Suspense, use, useEffect, useRef } from "react";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CircleDashedIcon,
  CircleSlashIcon,
  ClockIcon,
  FileTextIcon,
  MessagesSquareIcon,
  ShieldAlertIcon,
  SparklesIcon,
  XCircleIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CondensedMessages } from "@/services/hume/components/condensed-messages";
import {
  interviewFeedbackSchema,
  type InterviewFeedback,
} from "@/services/ai/interviews/schema";
import {
  canRetakeFailedInterview,
  normalizePartialFeedback,
  parseInterviewFeedback,
  type InterviewFeedbackParsed,
} from "@/features/interviews/lib/interview-feedback-json";
import type { Database } from "@/services/supabase/types/database";

type FeedbackSource = Database["public"]["Tables"]["interviews"]["Row"]["feedback"];

export type InterviewReviewClientProps = {
  interview: {
    id: string;
    subject: "profession" | "resume" | string;
    duration: string | null;
    completedAt: string | null;
    completedOnLabel: string;
    retakeAfterLabel: string | null;
    feedback: FeedbackSource;
    canStreamFeedback: boolean;
  };
  user: { name: string; imageUrl: string };
  messagesPromise: Promise<{ isUser: boolean; content: string[] }[]>;
  backHref: string;
};

export function InterviewReviewClient({
  interview,
  user,
  messagesPromise,
  backHref,
}: InterviewReviewClientProps) {
  const t = useTranslations("assessments.interview.review");
  const router = useRouter();
  const persistedFeedback = parseInterviewFeedback(interview.feedback);

  const {
    object,
    isLoading: isStreaming,
    error: streamError,
    submit,
  } = useObject({
    api: "/api/ai/interviews/feedback",
    schema: interviewFeedbackSchema,
    fetch: (url, options) =>
      fetch(url, {
        ...options,
        headers: {
          ...(options?.headers ?? {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ interviewId: interview.id }),
      }),
    onFinish: () => {
      router.refresh();
    },
  });

  const submittedRef = useRef(false);
  useEffect(() => {
    if (persistedFeedback != null) return;
    if (!interview.canStreamFeedback) return;
    if (submittedRef.current) return;
    submittedRef.current = true;
    submit(null);
  }, [persistedFeedback, interview.canStreamFeedback, submit]);

  const streamed = normalizePartialFeedback(
    object as Partial<InterviewFeedback> | null,
  );
  const displayed = persistedFeedback ?? streamed;
  const hasAnyContent =
    (displayed.decision ?? displayed.summary ?? displayed.scores?.length) !=
    null;

  const subjectLabel =
    interview.subject === "profession"
      ? t("subject.profession")
      : interview.subject === "resume"
        ? t("subject.resume")
        : interview.subject.replace(/_/g, " ");

  const retakeHref =
    interview.subject === "profession"
      ? "/interviews/profession"
      : interview.subject === "resume"
        ? "/interviews/resume"
        : undefined;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <Button variant="ghost" size="sm" className="gap-1 px-0" asChild>
        <Link href={backHref}>
          <ArrowLeftIcon className="size-4" />
          {t("back")}
        </Link>
      </Button>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-2xl">{subjectLabel}</CardTitle>
              <CardDescription>
                {t("completedOn", { date: interview.completedOnLabel })}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {interview.duration && (
                <Badge
                  variant="outline"
                  className="font-normal text-muted-foreground"
                >
                  <ClockIcon className="size-3.5" />
                  {interview.duration}
                </Badge>
              )}
              <MessagesDialogTrigger
                messagesPromise={messagesPromise}
                user={user}
                subjectLabel={subjectLabel}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      <FeedbackSection
        feedback={displayed}
        persisted={persistedFeedback != null}
        isStreaming={isStreaming}
        hasAnyContent={hasAnyContent}
        streamError={streamError?.message}
        completedAt={interview.completedAt}
        retakeAfterLabel={interview.retakeAfterLabel}
        retakeHref={retakeHref}
        canStreamFeedback={interview.canStreamFeedback}
        onRetry={() => {
          submittedRef.current = true;
          submit(null);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feedback section
// ---------------------------------------------------------------------------

function FeedbackSection({
  feedback,
  persisted,
  isStreaming,
  hasAnyContent,
  streamError,
  completedAt,
  retakeAfterLabel,
  retakeHref,
  canStreamFeedback,
  onRetry,
}: {
  feedback: Partial<InterviewFeedbackParsed>;
  persisted: boolean;
  isStreaming: boolean;
  hasAnyContent: boolean;
  streamError?: string;
  completedAt: string | null;
  retakeAfterLabel: string | null;
  retakeHref?: string;
  canStreamFeedback: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations("assessments.interview.review");

  if (!canStreamFeedback && !persisted) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <CircleSlashIcon className="size-10 text-muted-foreground" />
          <CardTitle className="text-lg">{t("notReadyTitle")}</CardTitle>
          <CardDescription>{t("notReadyDescription")}</CardDescription>
          <div className="flex justify-center">
            <Link 
              href={retakeHref ?? "/dashboard/assessments"}
              className="text-muted-foreground hover:text-foreground inline-flex w-fit shrink-0 items-center gap-2 rounded-lg border border-dashed border-border bg-muted/15 px-3 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              {t("completeInterview")}
            </Link>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (streamError && !hasAnyContent) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <AlertTriangleIcon className="size-10 text-destructive" />
          <CardTitle className="text-lg">{t("errorTitle")}</CardTitle>
          <CardDescription>{streamError}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button type="button" onClick={onRetry}>
            {t("retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const decision = feedback.decision;

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <SparklesIcon className="size-4 text-muted-foreground" />
            {t("feedbackTitle")}
          </CardTitle>
          <StreamingIndicator
            isStreaming={isStreaming}
            persisted={persisted}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {decision ? (
            <Badge
              variant={decision === "PASS" ? "default" : "destructive"}
              className="text-xs"
            >
              {decision}
            </Badge>
          ) : (
            <Skeleton className="h-5 w-16 rounded-full" />
          )}
          {feedback.average_score != null ? (
            <span className="text-sm text-muted-foreground tabular-nums">
              {t("averageScore", {
                value: feedback.average_score.toFixed(1),
              })}
            </span>
          ) : (
            <Skeleton className="h-4 w-28" />
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <RetakeNotice
          decision={decision}
          completedAt={completedAt}
          retakeAfterLabel={retakeAfterLabel}
          retakeHref={retakeHref}
        />

        <section className="space-y-2">
          <SectionHeading>{t("summary")}</SectionHeading>
          {feedback.summary ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {feedback.summary}
            </p>
          ) : (
            <ParagraphSkeleton />
          )}
        </section>

        <section className="space-y-3">
          <SectionHeading>{t("scores")}</SectionHeading>
          <ScoresGrid scores={feedback.scores} />
        </section>

        <BulletSection
          heading={t("strengths")}
          items={feedback.strengths}
          emptyLabel={t("noStrengths")}
        />
        <BulletSection
          heading={t("weaknesses")}
          items={feedback.weaknesses}
          emptyLabel={t("noWeaknesses")}
        />
        <BulletSection
          heading={t("riskFlags")}
          items={feedback.risk_flags}
          emptyLabel={t("noRiskFlags")}
          tone="destructive"
          icon={<ShieldAlertIcon className="size-4" />}
        />
      </CardContent>
    </Card>
  );
}

function StreamingIndicator({
  isStreaming,
  persisted,
}: {
  isStreaming: boolean;
  persisted: boolean;
}) {
  const t = useTranslations("assessments.interview.review");
  if (persisted) return null;
  if (!isStreaming) return null;
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground">
      <CircleDashedIcon className="size-3.5 animate-spin" />
      {t("streaming")}
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

function ScoresGrid({
  scores,
}: {
  scores: Partial<InterviewFeedbackParsed>["scores"];
}) {
  if (scores == null || scores.length === 0) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {scores.map((entry, index) => (
        <li
          key={`${entry.label}-${index}`}
          className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2 text-sm"
        >
          <span className="truncate capitalize text-muted-foreground">
            {entry.label}
          </span>
          <ScorePill value={entry.score} />
        </li>
      ))}
    </ul>
  );
}

function ScorePill({ value }: { value: number }) {
  const color =
    value >= 4
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : value >= 3
        ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
        : value >= 2
          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
          : "bg-destructive/15 text-destructive";

  return (
    <span
      className={cn(
        "min-w-10 rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums",
        color,
      )}
    >
      {value}
    </span>
  );
}

function BulletSection({
  heading,
  items,
  tone,
  icon,
  emptyLabel,
}: {
  heading: string;
  items: string[] | undefined;
  tone?: "destructive";
  icon?: React.ReactNode;
  emptyLabel: string;
}) {
  const hasItems = items != null && items.length > 0;

  return (
    <section className="space-y-2">
      <div
        className={cn(
          "flex items-center gap-1.5",
          tone === "destructive" && "text-destructive",
        )}
      >
        {icon}
        <SectionHeading>{heading}</SectionHeading>
      </div>
      {hasItems ? (
        <ul
          className={cn(
            "space-y-1.5 text-sm",
            tone === "destructive"
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          {items!.map((item, index) => (
            <li
              key={`${index}-${item.slice(0, 12)}`}
              className="flex gap-2 rounded-md border bg-muted/10 px-3 py-2"
            >
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-current" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : items == null ? (
        <div className="space-y-1.5">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-5/6" />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      )}
    </section>
  );
}

function ParagraphSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

function RetakeNotice({
  decision,
  completedAt,
  retakeAfterLabel,
  retakeHref,
}: {
  decision?: "PASS" | "FAIL";
  completedAt: string | null;
  retakeAfterLabel: string | null;
  retakeHref?: string;
}) {
  const t = useTranslations("assessments.interview.review");

  if (decision !== "FAIL") return null;

  const canRetake = canRetakeFailedInterview(
    {
      decision: "FAIL",
      scores: [],
    },
    completedAt,
  );

  if (canRetake && retakeHref) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm">
        <span className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
          <XCircleIcon className="size-4" />
          {t("retakeAvailable")}
        </span>
        <Button size="sm" asChild>
          <Link href={retakeHref}>{t("retake")}</Link>
        </Button>
      </div>
    );
  }

  if (retakeAfterLabel) {
    return (
      <p className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        {t.rich("retakeAfter", {
          date: retakeAfterLabel,
          strong: (chunks) => (
            <span className="font-medium text-foreground">{chunks}</span>
          ),
        })}
      </p>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Messages dialog
// ---------------------------------------------------------------------------

function MessagesDialogTrigger({
  messagesPromise,
  user,
  subjectLabel,
}: {
  messagesPromise: Promise<{ isUser: boolean; content: string[] }[]>;
  user: { name: string; imageUrl: string };
  subjectLabel: string;
}) {
  const t = useTranslations("assessments.interview.review");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <MessagesSquareIcon className="size-4" />
          {t("viewMessages")}
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton
        className="flex h-[min(90vh,900px)] max-h-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl lg:max-w-5xl"
      >
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <FileTextIcon className="size-4 text-muted-foreground" />
            {t("messagesTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("messagesDescription", { subject: subjectLabel })}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <Suspense fallback={<MessagesFallback />}>
            <MessagesBody promise={messagesPromise} user={user} />
          </Suspense>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MessagesBody({
  promise,
  user,
}: {
  promise: Promise<{ isUser: boolean; content: string[] }[]>;
  user: { name: string; imageUrl: string };
}) {
  const t = useTranslations("assessments.interview.review");
  const messages = use(promise);

  if (messages.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("transcriptEmpty")}
      </p>
    );
  }

  return (
    <CondensedMessages messages={messages} user={user} className="w-full" />
  );
}

function MessagesFallback() {
  return (
    <div className="space-y-3 py-4">
      <Skeleton className="h-16 w-3/4" />
      <Skeleton className="h-16 w-2/3 self-end" />
      <Skeleton className="h-24 w-4/5" />
      <Skeleton className="h-16 w-3/5 self-end" />
    </div>
  );
}
