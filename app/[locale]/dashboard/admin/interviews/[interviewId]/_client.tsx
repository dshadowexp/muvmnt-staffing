"use client";

import { Suspense, use, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  FileTextIcon,
  Loader2,
  MessagesSquareIcon,
  ShieldAlert,
  ShieldCheckIcon,
  UserCheck,
  UserMinus,
  UserX,
  XCircleIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AdminInterviewRow } from "@/features/interviews/dal/admin-queries";
import type { InterviewFeedback } from "@/services/ai/interviews/schema";
import type { ResumeSummary } from "@/services/ai/resumes/schema";
import { submitInterviewReviewAction, retryVideoAnalysisAction } from "@/features/interviews/actions/admin-review-action";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { CondensedMessages } from "@/services/hume/components/condensed-messages";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// ─── Inline types (mirrors server-only video-analysis types) ─────────────────

type VideoAnalysisFlag = {
  type: string;
  description: string;
  timestampSeconds?: number;
};

type IdentityMatch = {
  verdict: "match" | "uncertain" | "no_match";
  confidence: "low" | "medium" | "high";
  rationale: string;
};

type VideoAnalysisResult = {
  confidence: "low" | "medium" | "high";
  flags: VideoAnalysisFlag[];
  summary: string;
  identityMatch?: IdentityMatch;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseJson<T>(raw: unknown): T | null {
  if (raw == null) return null;
  try {
    return (typeof raw === "string" ? JSON.parse(raw) : raw) as T;
  } catch {
    return null;
  }
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

// ─── AI Feedback card ─────────────────────────────────────────────────────────

function AIFeedbackCard({ feedback: raw, messagesPromise, user, subjectLabel }: { feedback: unknown, messagesPromise: Promise<{ isUser: boolean; content: string[] }[]>, user: { name: string; imageUrl: string }, subjectLabel: string }) {
  const feedback = parseJson<InterviewFeedback>(raw);

  if (!feedback) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No AI feedback available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isPass = feedback.decision === "PASS";
  const decisionClass = isPass
    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : "border-red-400/40 bg-red-500/10 text-red-700 dark:text-red-300";

  return (
    <Card>
      <CardHeader className="pb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">AI Feedback</CardTitle>
          {/* Decision + average score */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Badge variant="outline" className={cn("gap-1.5 px-2.5 py-1 text-sm font-semibold", decisionClass)}>
              {isPass ? <CheckCircleIcon className="size-3.5" /> : <XCircleIcon className="size-3.5" />}
              {feedback.decision}
            </Badge>
            {feedback.average_score != null && (
              <span className="text-sm text-muted-foreground tabular-nums">
                Average score:{" "}
                <span className="font-semibold text-foreground">
                  {feedback.average_score.toFixed(1)}/5
                </span>
              </span>
            )}
          </div>
        </div>
        <div>
          <MessagesDialogTrigger
            messagesPromise={messagesPromise}
            user={user}
            subjectLabel={subjectLabel}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary */}
        {feedback.summary && (
          <section className="space-y-1.5">
            <SectionLabel>Summary</SectionLabel>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {feedback.summary}
            </p>
          </section>
        )}

        {/* Scores */}
        {Array.isArray(feedback.scores) && feedback.scores.length > 0 && (
          <section className="space-y-2">
            <SectionLabel>Scores</SectionLabel>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {feedback.scores.map((s, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2 text-sm"
                >
                  <span className="truncate capitalize text-muted-foreground">
                    {s.label}
                  </span>
                  <ScorePill value={s.score} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Strengths + Weaknesses */}
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.isArray(feedback.strengths) && feedback.strengths.length > 0 && (
            <section className="space-y-2">
              <SectionLabel>Strengths</SectionLabel>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {feedback.strengths.map((s, i) => (
                  <li
                    key={i}
                    className="flex gap-2 rounded-md border bg-muted/10 px-3 py-2"
                  >
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-emerald-500" />
                    {s}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {Array.isArray(feedback.weaknesses) && feedback.weaknesses.length > 0 && (
            <section className="space-y-2">
              <SectionLabel>Weaknesses</SectionLabel>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {feedback.weaknesses.map((w, i) => (
                  <li
                    key={i}
                    className="flex gap-2 rounded-md border bg-muted/10 px-3 py-2"
                  >
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-red-500" />
                    {w}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Risk flags */}
        {Array.isArray(feedback.risk_flags) && feedback.risk_flags.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-3.5" />
              <SectionLabel>Risk Flags</SectionLabel>
            </div>
            <ul className="space-y-1.5">
              {feedback.risk_flags.map((flag, i) => (
                <li
                  key={i}
                  className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                >
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-amber-500" />
                  {flag}
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Recording card ───────────────────────────────────────────────────────────

function RecordingCard({ url }: { url: string }) {
  console.log(url);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recording</CardTitle>
      </CardHeader>
      <CardContent>
      <video controls width="320" height="240" preload="none">
        <source src={url} type="video/webm" />
        Your browser does not support the video tag.
      </video>

        {/* <video
          key={url}
          controls
          className="w-full rounded-lg bg-black"
          src={url}
          preload="metadata"
          controlsList="nodownload"
        /> */}
      </CardContent>
    </Card>
  );
}

// ─── Resume analysis card ─────────────────────────────────────────────────────

function ResumeAnalysisCard({ summary }: { summary: ResumeSummary }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Resume Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* Candidate snapshot */}
        <div className="rounded-lg border bg-muted/20 px-3 py-2.5 space-y-0.5">
          {summary.candidate.name && (
            <p className="font-semibold leading-snug">{summary.candidate.name}</p>
          )}
          {summary.candidate.currentRole && (
            <p className="text-muted-foreground">{summary.candidate.currentRole}</p>
          )}
          {summary.candidate.yearsOfExperience && (
            <p className="text-xs text-muted-foreground">{summary.candidate.yearsOfExperience} experience</p>
          )}
        </div>

        {/* Career progression */}
        {summary.careerProgression && (
          <section className="space-y-1">
            <SectionLabel>Career Progression</SectionLabel>
            <p className="leading-relaxed text-muted-foreground">{summary.careerProgression}</p>
          </section>
        )}

        {/* Key skills */}
        {summary.keySkills.length > 0 && (
          <section className="space-y-1.5">
            <SectionLabel>Key Skills</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {summary.keySkills.map((skill, i) => (
                <Badge key={i} variant="secondary" className="text-xs font-normal">
                  {skill}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* Notable achievements */}
        {summary.notableAchievements.length > 0 && (
          <section className="space-y-1.5">
            <SectionLabel>Notable Achievements</SectionLabel>
            <ul className="space-y-1.5 text-muted-foreground">
              {summary.notableAchievements.map((a, i) => (
                <li key={i} className="flex gap-2 rounded-md border bg-muted/10 px-3 py-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-sky-500" />
                  {a}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Education & certifications */}
        <div className="grid gap-3 sm:grid-cols-2">
          {summary.education && (
            <section className="space-y-1">
              <SectionLabel>Education</SectionLabel>
              <p className="text-muted-foreground">{summary.education}</p>
            </section>
          )}
          {summary.certifications.length > 0 && (
            <section className="space-y-1.5">
              <SectionLabel>Certifications</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {summary.certifications.map((cert, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-normal">
                    {cert}
                  </Badge>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Validation warning */}
        {!summary.validation.valid && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>Document flagged: {summary.validation.reason ?? "invalid resume"}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Identity match ───────────────────────────────────────────────────────────

function IdentityMatchCard({ identityMatch }: { identityMatch: IdentityMatch }) {
  const { verdict, confidence, rationale } = identityMatch;
  const cfg = {
    match: {
      label: "Identity Verified",
      icon: <UserCheck className="size-4" />,
      card: "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30",
      text: "text-emerald-800 dark:text-emerald-300",
      badge: "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    },
    uncertain: {
      label: "Identity Uncertain",
      icon: <UserMinus className="size-4" />,
      card: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
      text: "text-amber-800 dark:text-amber-300",
      badge: "border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    },
    no_match: {
      label: "Identity Mismatch",
      icon: <UserX className="size-4" />,
      card: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30",
      text: "text-red-800 dark:text-red-300",
      badge: "border-red-400/40 bg-red-500/10 text-red-700 dark:text-red-300",
    },
  }[verdict];

  return (
    <div className={cn("rounded-lg border p-4 space-y-2", cfg.card)}>
      <div className="flex items-center justify-between gap-3">
        <div className={cn("flex items-center gap-2 text-sm font-semibold", cfg.text)}>
          {cfg.icon}
          {cfg.label}
        </div>
        <Badge variant="outline" className={cn("text-xs", cfg.badge)}>
          {confidence.charAt(0).toUpperCase() + confidence.slice(1)} confidence
        </Badge>
      </div>
      <p className={cn("text-sm leading-relaxed", cfg.text)}>{rationale}</p>
    </div>
  );
}

// ─── Video analysis card ──────────────────────────────────────────────────────

function VideoAnalysisCard({
  status,
  videoFeedback,
  interviewId,
}: {
  status: string | null;
  videoFeedback: unknown;
  interviewId: string;
}) {
  const [retrying, setRetrying] = useState(false);
  const isPending = !status || status === "pending";
  const isFailed = status === "failed";
  const isCompleted = status === "completed";

  async function handleRetry() {
    setRetrying(true);
    try {
      const res = await retryVideoAnalysisAction(interviewId);
      if (res.error) {
        toast.error(res.message ?? "Failed to retry analysis.");
      } else {
        toast.success("Video analysis queued. The page will update when it completes.");
      }
    } finally {
      setRetrying(false);
    }
  }

  const parsed = isCompleted
    ? parseJson<VideoAnalysisResult>(videoFeedback)
    : null;

  const riskLabel =
    parsed?.confidence === "low"
      ? "Low Risk"
      : parsed?.confidence === "medium"
        ? "Medium Risk"
        : "High Risk";

  const riskClass =
    parsed?.confidence === "low"
      ? "text-green-700 dark:text-green-400"
      : parsed?.confidence === "medium"
        ? "text-amber-700 dark:text-amber-400"
        : "text-red-700 dark:text-red-400";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Video Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Analysis in progress…
          </div>
        )}

        {isFailed && (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-red-700 dark:text-red-400">
              Video analysis failed. Please review manually or retry.
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={retrying}
              onClick={handleRetry}
            >
              {retrying && <Loader2 className="mr-2 size-3.5 animate-spin" />}
              Retry
            </Button>
          </div>
        )}

        {isCompleted && parsed && (
          <div className="space-y-4">
            {parsed.identityMatch && (
              <IdentityMatchCard identityMatch={parsed.identityMatch} />
            )}

            <div className="flex items-center gap-2">
              <ShieldCheckIcon className={cn("size-4", riskClass)} />
              <span className="text-sm font-medium">Integrity risk:</span>
              <Badge variant="outline" className={cn("gap-1.5 px-2", riskClass)}>
                {parsed.identityMatch?.verdict === "no_match" && (
                  <ShieldAlert className="size-3" />
                )}
                {riskLabel}
              </Badge>
            </div>

            {parsed.summary && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {parsed.summary}
              </p>
            )}

            {parsed.flags.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                <ShieldCheckIcon className="size-4 shrink-0" />
                No cheating indicators detected.
              </div>
            ) : (
              <section className="space-y-2">
                <SectionLabel>Flags detected</SectionLabel>
                <div className="space-y-2">
                  {parsed.flags.map((flag, i) => (
                    <div
                      key={i}
                      className="rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold">{flag.type}</span>
                        {flag.timestampSeconds != null && (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {Math.floor(flag.timestampSeconds / 60)}:
                            {String(flag.timestampSeconds % 60).padStart(2, "0")}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-muted-foreground">
                        {flag.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {isCompleted && !parsed && (
          <p className="text-sm text-muted-foreground">
            Analysis data unavailable.
          </p>
        )}
      </CardContent>
    </Card>
  );
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
    <div className="flex flex-col gap-3 py-4">
      <Skeleton className="h-16 w-3/4" />
      <Skeleton className="h-16 w-2/3 self-end" />
      <Skeleton className="h-24 w-4/5" />
      <Skeleton className="h-16 w-3/5 self-end" />
    </div>
  );
}


// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  interview: AdminInterviewRow;
  messagesPromise: Promise<{ isUser: boolean; content: string[] }[]>;
  user: { name: string; imageUrl: string };
  subjectLabel: string;
  completedLabel: string | null;
  recordingUrl: string | null;
  resumeSummary: ResumeSummary | null;
};

export function AdminInterviewReviewClient({
  interview,
  messagesPromise,
  user,
  subjectLabel,
  completedLabel,
  recordingUrl,
  resumeSummary,
}: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleReview(result: "pass" | "fail") {
    setSubmitting(true);
    try {
      const res = await submitInterviewReviewAction(interview.id, result);
      if (res.error) {
        toast.error(res.message ?? "Failed to submit review.");
      } else {
        toast.success(result === "pass" ? "Marked as passed." : "Marked as failed.");
        router.push("/dashboard/admin/interviews");
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-1 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3.5" />
            Back to Interviews
          </button>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            {interview.worker_name ?? "Unknown Worker"}{" "}
            <span className="font-normal text-muted-foreground">—</span>{" "}
            {subjectLabel}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {completedLabel && (
              <span className="flex items-center gap-1.5">
                <ClockIcon className="size-3.5" />
                Completed {completedLabel}
              </span>
            )}
            {interview.duration && (
              <span className="flex items-center gap-1.5">
                <ClockIcon className="size-3.5" />
                {interview.duration}
              </span>
            )}
            {interview.reviewed && (
              <Badge
                variant="outline"
                className={cn(
                  "gap-1.5",
                  interview.result === "pass"
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-red-400/40 bg-red-500/10 text-red-700 dark:text-red-300",
                )}
              >
                {interview.result === "pass" ? (
                  <CheckCircleIcon className="size-3.5" />
                ) : (
                  <XCircleIcon className="size-3.5" />
                )}
                {interview.result === "pass" ? "Passed" : "Failed"}
              </Badge>
            )}
          </div>
        </div>

        {!interview.reviewed && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="destructive"
              disabled={submitting}
              onClick={() => handleReview("fail")}
            >
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              <XCircleIcon className="size-4" />
              Mark as Failed
            </Button>
            <Button
              disabled={submitting}
              className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
              onClick={() => handleReview("pass")}
            >
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              <CheckCircleIcon className="size-4" />
              Mark as Passed
            </Button>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {resumeSummary && <ResumeAnalysisCard summary={resumeSummary} />}
      <AIFeedbackCard
        feedback={interview.feedback}
        messagesPromise={messagesPromise}
        user={user}
        subjectLabel={subjectLabel}
      />
      <VideoAnalysisCard
        status={interview.video_feedback_status}
        videoFeedback={interview.video_feedback}
        interviewId={interview.id}
      />
      {recordingUrl && <RecordingCard url={recordingUrl} />}
    </div>
  );
}
