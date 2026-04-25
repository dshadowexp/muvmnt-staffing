"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Loader2, AlertTriangle, UserCheck, UserX, UserMinus, ShieldAlert } from "lucide-react";

import type { AdminInterviewRow } from "@/features/interviews/dal/admin-queries";
import type { InterviewFeedback } from "@/services/ai/interviews/schema";
import { submitInterviewReviewAction } from "@/features/interviews/actions/admin-review-action";

// Inline types mirroring @/services/ai/interviews/video-analysis (server-only there)
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

// ─── Badge helpers ────────────────────────────────────────────────────────────

function HumeFeedbackBadge({ feedback }: { feedback: unknown }) {
  if (feedback == null) {
    return (
      <Badge variant="outline" className="text-muted-foreground gap-1.5 px-1.5">
        Pending
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="gap-1.5 px-1.5 text-green-700 dark:text-green-400"
    >
      Ready
    </Badge>
  );
}

function VideoAnalysisBadge({
  status,
  videoFeedback,
}: {
  status: string | null;
  videoFeedback: unknown;
}) {
  if (!status || status === "pending") {
    return (
      <Badge variant="outline" className="gap-1.5 px-1.5 text-yellow-700 dark:text-yellow-400">
        <Loader2 className="size-3 animate-spin" />
        Pending
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge variant="outline" className="gap-1.5 px-1.5 text-red-700 dark:text-red-400">
        Failed
      </Badge>
    );
  }
  if (status === "completed" && videoFeedback != null) {
    const parsed = videoFeedback as Partial<VideoAnalysisResult>;
    const confidence = parsed.confidence ?? "low";
    const identityVerdict = parsed.identityMatch?.verdict;

    // Escalate to high risk if identity does not match, regardless of other flags
    const effectiveConfidence =
      identityVerdict === "no_match" ? "high" :
      identityVerdict === "uncertain" && confidence === "low" ? "medium" :
      confidence;

    const confidenceClass =
      effectiveConfidence === "low"
        ? "text-green-700 dark:text-green-400"
        : effectiveConfidence === "medium"
          ? "text-amber-700 dark:text-amber-400"
          : "text-red-700 dark:text-red-400";
    const confidenceLabel =
      identityVerdict === "no_match" ? "ID Mismatch" :
      identityVerdict === "uncertain" ? "ID Uncertain" :
      effectiveConfidence === "low" ? "Low Risk" :
      effectiveConfidence === "medium" ? "Medium Risk" : "High Risk";
    return (
      <Badge variant="outline" className={`gap-1.5 px-1.5 ${confidenceClass}`}>
        {identityVerdict === "no_match" && <ShieldAlert className="size-3" />}
        {confidenceLabel}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground gap-1.5 px-1.5">
      —
    </Badge>
  );
}

function ResultBadge({
  reviewed,
  result,
}: {
  reviewed: boolean;
  result: string | null;
}) {
  if (!reviewed) {
    return (
      <Badge variant="outline" className="text-muted-foreground gap-1.5 px-1.5">
        <Loader2 className="size-3 animate-spin" />
        Under review
      </Badge>
    );
  }
  if (result === "pass") {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 px-1.5 text-green-700 dark:text-green-400"
      >
        Passed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1.5 px-1.5 text-red-700 dark:text-red-400">
      Failed
    </Badge>
  );
}

// ─── Dialog sections ──────────────────────────────────────────────────────────

function RecordingSection({ recordingUrl }: { recordingUrl: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recording</CardTitle>
      </CardHeader>
      <CardContent>
        <video
          controls
          className="w-full rounded-lg"
          src={recordingUrl}
        />
      </CardContent>
    </Card>
  );
}

function AIFeedbackSection({ feedback }: { feedback: unknown }) {
  if (feedback == null) return null;

  let parsed: InterviewFeedback | null = null;
  try {
    parsed =
      typeof feedback === "string"
        ? (JSON.parse(feedback) as InterviewFeedback)
        : (feedback as InterviewFeedback);
  } catch {
    return null;
  }

  if (!parsed) return null;

  const decisionClass =
    parsed.decision === "PASS"
      ? "text-green-700 dark:text-green-400"
      : "text-red-700 dark:text-red-400";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">AI Feedback</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Decision + average score */}
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`gap-1.5 px-2 py-1 text-sm font-semibold ${decisionClass}`}>
            {parsed.decision}
          </Badge>
          <span className="text-muted-foreground text-sm">
            Average score:{" "}
            <span className="text-foreground font-medium">
              {typeof parsed.average_score === "number"
                ? parsed.average_score.toFixed(1)
                : "—"}
              /5
            </span>
          </span>
        </div>

        {/* Summary */}
        {parsed.summary && (
          <p className="text-sm leading-relaxed">{parsed.summary}</p>
        )}

        {/* Scores grid */}
        {Array.isArray(parsed.scores) && parsed.scores.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">Scores</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {parsed.scores.map((s, i) => (
                <div
                  key={i}
                  className="bg-muted/50 rounded-lg px-3 py-2 text-sm"
                >
                  <div className="text-muted-foreground truncate text-xs">
                    {s.label}
                  </div>
                  <div className="font-semibold">{s.score}/5</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.isArray(parsed.strengths) && parsed.strengths.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-medium text-green-700 dark:text-green-400">
                Strengths
              </p>
              <ul className="space-y-1">
                {parsed.strengths.map((s, i) => (
                  <li key={i} className="text-sm before:mr-1.5 before:content-['•']">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {Array.isArray(parsed.weaknesses) && parsed.weaknesses.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-medium text-red-700 dark:text-red-400">
                Weaknesses
              </p>
              <ul className="space-y-1">
                {parsed.weaknesses.map((w, i) => (
                  <li key={i} className="text-sm before:mr-1.5 before:content-['•']">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Risk flags */}
        {Array.isArray(parsed.risk_flags) && parsed.risk_flags.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
            <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-amber-800 dark:text-amber-400">
              <AlertTriangle className="size-4" />
              Risk Flags
            </div>
            <ul className="space-y-1">
              {parsed.risk_flags.map((flag, i) => (
                <li
                  key={i}
                  className="text-sm text-amber-800 before:mr-1.5 before:content-['•'] dark:text-amber-300"
                >
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IdentityMatchSection({ identityMatch }: { identityMatch: IdentityMatch }) {
  const { verdict, confidence, rationale } = identityMatch;

  const config = {
    match: {
      label: "Identity Verified",
      icon: <UserCheck className="size-4" />,
      cardClass: "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30",
      textClass: "text-emerald-800 dark:text-emerald-300",
      badgeClass: "border-emerald-400/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
    },
    uncertain: {
      label: "Identity Uncertain",
      icon: <UserMinus className="size-4" />,
      cardClass: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
      textClass: "text-amber-800 dark:text-amber-300",
      badgeClass: "border-amber-400/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
    },
    no_match: {
      label: "Identity Mismatch",
      icon: <UserX className="size-4" />,
      cardClass: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30",
      textClass: "text-red-800 dark:text-red-300",
      badgeClass: "border-red-400/40 bg-red-500/10 text-red-800 dark:text-red-300",
    },
  }[verdict];

  return (
    <div className={`rounded-lg border p-4 space-y-2 ${config.cardClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div className={`flex items-center gap-2 font-semibold text-sm ${config.textClass}`}>
          {config.icon}
          {config.label}
        </div>
        <Badge variant="outline" className={`text-xs ${config.badgeClass}`}>
          {confidence.charAt(0).toUpperCase() + confidence.slice(1)} confidence
        </Badge>
      </div>
      <p className={`text-sm leading-relaxed ${config.textClass}`}>{rationale}</p>
    </div>
  );
}

function VideoAnalysisSection({
  status,
  videoFeedback,
}: {
  status: string | null;
  videoFeedback: unknown;
}) {
  const isPending = !status || status === "pending";
  const isFailed = status === "failed";
  const isCompleted = status === "completed";

  let parsed: VideoAnalysisResult | null = null;
  if (isCompleted && videoFeedback != null) {
    try {
      parsed =
        typeof videoFeedback === "string"
          ? (JSON.parse(videoFeedback) as VideoAnalysisResult)
          : (videoFeedback as VideoAnalysisResult);
    } catch {
      parsed = null;
    }
  }

  const confidenceClass =
    parsed?.confidence === "low"
      ? "text-green-700 dark:text-green-400"
      : parsed?.confidence === "medium"
        ? "text-amber-700 dark:text-amber-400"
        : "text-red-700 dark:text-red-400";

  const confidenceLabel =
    parsed?.confidence === "low"
      ? "Low Risk"
      : parsed?.confidence === "medium"
        ? "Medium Risk"
        : "High Risk";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Video Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isPending && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Analysis in progress...
          </div>
        )}

        {isFailed && (
          <p className="text-sm text-red-700 dark:text-red-400">
            Video analysis failed. Please retry or review manually.
          </p>
        )}

        {isCompleted && parsed && (
          <>
            {/* Identity match — shown prominently at the top when available */}
            {parsed.identityMatch && (
              <IdentityMatchSection identityMatch={parsed.identityMatch} />
            )}

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Integrity risk:</span>
              <Badge
                variant="outline"
                className={`gap-1.5 px-1.5 ${confidenceClass}`}
              >
                {confidenceLabel}
              </Badge>
            </div>

            {parsed.summary && (
              <p className="text-sm leading-relaxed">{parsed.summary}</p>
            )}

            {parsed.flags.length === 0 ? (
              <p className="text-sm text-green-700 dark:text-green-400">
                No cheating indicators detected.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium">Flags detected:</p>
                {parsed.flags.map((flag, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold">{flag.type}</span>
                      {flag.timestampSeconds != null && (
                        <span className="text-muted-foreground shrink-0 text-xs">
                          {Math.floor(flag.timestampSeconds / 60)}:
                          {String(flag.timestampSeconds % 60).padStart(2, "0")}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-0.5">
                      {flag.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  interviews: AdminInterviewRow[];
}

export function AdminInterviewsClient({ interviews }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<AdminInterviewRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleReview(result: "pass" | "fail") {
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await submitInterviewReviewAction(selected.id, result);
      if (res.error) {
        toast.error(res.message ?? "Failed to submit review.");
      } else {
        setSelected(null);
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Worker</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Hume Feedback</TableHead>
              <TableHead>Video Analysis</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {interviews.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-muted-foreground h-24 text-center text-sm"
                >
                  No completed interviews yet.
                </TableCell>
              </TableRow>
            ) : (
              interviews.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelected(row)}
                >
                  <TableCell className="font-medium">
                    {row.worker_name ?? "Unknown"}
                  </TableCell>
                  <TableCell>
                    {row.subject === "combined" ? "Combined" : row.subject === "profession" ? "Profession" : "Resume"}
                  </TableCell>
                  <TableCell>{row.duration ?? "—"}</TableCell>
                  <TableCell>
                    {row.completed_at
                      ? format(new Date(row.completed_at), "MMM d, yyyy")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <HumeFeedbackBadge feedback={row.feedback} />
                  </TableCell>
                  <TableCell>
                    <VideoAnalysisBadge
                      status={row.video_feedback_status}
                      videoFeedback={row.video_feedback}
                    />
                  </TableCell>
                  <TableCell>
                    <ResultBadge
                      reviewed={row.reviewed}
                      result={row.result}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(row);
                      }}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col">
          <DialogHeader>
            <DialogTitle>
              {selected?.worker_name ?? "Unknown"} —{" "}
              {selected?.subject === "combined" ? "Combined" : selected?.subject === "profession" ? "Profession" : "Resume"} Interview
            </DialogTitle>
            <DialogDescription>
              Completed{" "}
              {selected?.completed_at
                ? format(new Date(selected.completed_at), "MMM d, yyyy")
                : "—"}{" "}
              · {selected?.duration ?? "—"}
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable body */}
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {selected?.recording_url && (
              <RecordingSection recordingUrl={selected.recording_url} />
            )}
            {selected && <AIFeedbackSection feedback={selected.feedback} />}
            {selected && (
              <VideoAnalysisSection
                status={selected.video_feedback_status}
                videoFeedback={selected.video_feedback}
              />
            )}
          </div>

          {/* Sticky footer — only shown if not yet reviewed */}
          {selected && !selected.reviewed && (
            <DialogFooter className="border-t border-border pt-4">
              <Button
                variant="destructive"
                disabled={submitting}
                onClick={() => handleReview("fail")}
              >
                {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Mark as Failed
              </Button>
              <Button
                variant="default"
                className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                disabled={submitting}
                onClick={() => handleReview("pass")}
              >
                {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Mark as Passed
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
