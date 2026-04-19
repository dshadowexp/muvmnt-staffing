import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/formatters";
import {
  interviewRetryEligibleAt,
  parseInterviewFeedback,
  canRetakeFailedInterview,
  type InterviewFeedbackParsed,
} from "@/features/interviews/lib/interview-feedback-json";
import type { Database } from "@/services/supabase/types/database";

type FeedbackSource = Database["public"]["Tables"]["interviews"]["Row"]["feedback"];

export function InterviewFeedbackPanel({
  feedback,
  completedAt,
  retakeHref,
}: {
  feedback: FeedbackSource;
  completedAt: string | null;
  /** When set and user is eligible to retake, show a link to start again. */
  retakeHref?: string;
}) {
  const parsed = parseInterviewFeedback(feedback);
  if (parsed == null) {
    return (
      <p className="text-sm text-muted-foreground">
        Feedback could not be loaded.
      </p>
    );
  }

  const showRetake =
    retakeHref &&
    parsed.decision === "FAIL" &&
    canRetakeFailedInterview(parsed, completedAt);

  return (
    <div className="space-y-6 text-sm">
      <RetakeNotice parsed={parsed} completedAt={completedAt} retakeHref={retakeHref} />
      {showRetake && (
        <Button size="sm" asChild>
          <Link href={retakeHref}>Start new interview</Link>
        </Button>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={parsed.decision === "PASS" ? "default" : "destructive"}>
          {parsed.decision}
        </Badge>
        {parsed.average_score != null && (
          <span className="text-muted-foreground tabular-nums">
            Avg. {parsed.average_score.toFixed(1)} / 5
          </span>
        )}
      </div>

      {parsed.summary && (
        <div>
          <p className="mb-1 font-medium">Summary</p>
          <p className="text-muted-foreground leading-relaxed">{parsed.summary}</p>
        </div>
      )}

      {parsed.scores && Object.keys(parsed.scores).length > 0 && (
        <div>
          <p className="mb-2 font-medium">Scores</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {Object.entries(parsed.scores).map(([k, v]) => (
              <li
                key={k}
                className="flex justify-between gap-4 rounded-md border px-3 py-2"
              >
                <span className="capitalize text-muted-foreground">
                  {k.replace(/_/g, " ")}
                </span>
                <span className="tabular-nums font-medium">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <BulletSection title="Strengths" items={parsed.strengths} />
      <BulletSection title="Weaknesses" items={parsed.weaknesses} />
      <BulletSection title="Risk flags" items={parsed.risk_flags} destructive />
    </div>
  );
}

function RetakeNotice({
  parsed,
  completedAt,
  retakeHref,
}: {
  parsed: InterviewFeedbackParsed;
  completedAt: string | null;
  retakeHref?: string;
}) {
  if (parsed.decision !== "FAIL") return null;

  const eligible = interviewRetryEligibleAt(completedAt);
  const canRetake = canRetakeFailedInterview(parsed, completedAt);

  if (canRetake && retakeHref) return null;

  if (canRetake) {
    return (
      <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-muted-foreground">
        You did not pass. You may start a new attempt from Assessments.
      </p>
    );
  }

  if (eligible) {
    return (
      <p className="rounded-md border px-3 py-2 text-muted-foreground">
        You did not pass. You can retake after{" "}
        <span className="font-medium text-foreground">
          {formatDateTime(eligible)}
        </span>{" "}
        (3 days from when you finished the interview).
      </p>
    );
  }

  return (
    <p className="rounded-md border px-3 py-2 text-muted-foreground">
      You did not pass. Retake timing will be available once your interview is
      marked complete.
    </p>
  );
}

function BulletSection({
  title,
  items,
  destructive,
}: {
  title: string;
  items?: string[];
  destructive?: boolean;
}) {
  if (!items?.length) return null;
  return (
    <div>
      <p
        className={
          destructive ? "mb-2 font-medium text-destructive" : "mb-2 font-medium"
        }
      >
        {title}
      </p>
      <ul className="list-inside list-disc space-y-1 text-muted-foreground">
        {items.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
