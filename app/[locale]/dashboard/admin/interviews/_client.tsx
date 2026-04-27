"use client";

import { format } from "date-fns";
import { useRouter } from "@/i18n/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CircleDashedIcon, ShieldAlert } from "lucide-react";
import type { AdminInterviewRow } from "@/features/interviews/dal/admin-queries";

// ─── Inline type (mirrors server-only video-analysis shape) ──────────────────

type VideoAnalysisResult = {
  confidence: "low" | "medium" | "high";
  identityMatch?: { verdict: "match" | "uncertain" | "no_match" };
};

// ─── Table badge helpers ──────────────────────────────────────────────────────

function HumeFeedbackBadge({ feedback }: { feedback: unknown }) {
  if (feedback == null) {
    return (
      <Badge variant="outline" className="gap-1.5 px-1.5 text-muted-foreground">
        Pending
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1.5 px-1.5 text-green-700 dark:text-green-400">
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
        <CircleDashedIcon className="size-3 animate-spin" />
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
    let parsed: Partial<VideoAnalysisResult> = {};
    try {
      parsed = (typeof videoFeedback === "string"
        ? JSON.parse(videoFeedback)
        : videoFeedback) as VideoAnalysisResult;
    } catch {
      /* ignore */
    }

    const confidence = parsed.confidence ?? "low";
    const identityVerdict = parsed.identityMatch?.verdict;

    const effective =
      identityVerdict === "no_match"
        ? "high"
        : identityVerdict === "uncertain" && confidence === "low"
          ? "medium"
          : confidence;

    const cls =
      effective === "low"
        ? "text-green-700 dark:text-green-400"
        : effective === "medium"
          ? "text-amber-700 dark:text-amber-400"
          : "text-red-700 dark:text-red-400";

    const label =
      identityVerdict === "no_match"
        ? "ID Mismatch"
        : identityVerdict === "uncertain"
          ? "ID Uncertain"
          : effective === "low"
            ? "Low Risk"
            : effective === "medium"
              ? "Medium Risk"
              : "High Risk";

    return (
      <Badge variant="outline" className={`gap-1.5 px-1.5 ${cls}`}>
        {identityVerdict === "no_match" && <ShieldAlert className="size-3" />}
        {label}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1.5 px-1.5 text-muted-foreground">
      —
    </Badge>
  );
}

function ResultBadge({ reviewed, result }: { reviewed: boolean; result: string | null }) {
  if (!reviewed) {
    return (
      <Badge variant="outline" className="gap-1.5 px-1.5 text-muted-foreground">
        <CircleDashedIcon className="size-3 animate-spin" />
        Under review
      </Badge>
    );
  }
  if (result === "pass") {
    return (
      <Badge variant="outline" className="gap-1.5 px-1.5 text-green-700 dark:text-green-400">
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

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  interviews: AdminInterviewRow[];
}

export function AdminInterviewsClient({ interviews }: Props) {
  const router = useRouter();

  function goToReview(id: string) {
    router.push(`/dashboard/admin/interviews/${id}` as Parameters<typeof router.push>[0]);
  }

  return (
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
              <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                No completed interviews yet.
              </TableCell>
            </TableRow>
          ) : (
            interviews.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => goToReview(row.id)}
              >
                <TableCell className="font-medium">{row.worker_name ?? "Unknown"}</TableCell>
                <TableCell>
                  {row.subject === "combined"
                    ? "Combined"
                    : row.subject === "profession"
                      ? "Profession"
                      : "Resume"}
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
                  <ResultBadge reviewed={row.reviewed} result={row.result} />
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToReview(row.id);
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
  );
}
