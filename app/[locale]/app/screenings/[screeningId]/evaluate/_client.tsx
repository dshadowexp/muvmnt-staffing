"use client";

import { useState } from "react";
import Image from "next/image";
import { format, formatDistanceToNow } from "date-fns";
import { useRouter } from "@/i18n/navigation";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ClipboardListIcon,
  RefreshCwIcon,
  UserIcon,
  XCircleIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BackLink } from "@/components/back-link";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { parseInterviewFeedback } from "@/features/interviews/lib/interview-feedback-json";
import type { CandidateWithResult, ScreeningRow } from "@/features/screenings/dal/queries";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type RankedCandidate = CandidateWithResult & {
  rank: number;
  averageScore: number | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getScoreColor(score: number | null): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 4) return "text-emerald-600";
  if (score >= 2.5) return "text-amber-500";
  return "text-red-500";
}

function getScoreBg(score: number | null): string {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score >= 4) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (score >= 2.5) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function getScoreBarColor(score: number): string {
  if (score >= 4) return "bg-emerald-500";
  if (score >= 2.5) return "bg-amber-400";
  return "bg-red-400";
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const text =
    parts.length >= 2
      ? `${parts[0]![0]}${parts[parts.length - 1]![0]}`
      : parts[0]!.slice(0, 2);
  return (
    <div className="flex size-full items-center justify-center rounded-full bg-primary/10 text-sm font-semibold uppercase text-primary">
      {text.toUpperCase()}
    </div>
  );
}

function Avatar({
  photoUrl,
  name,
  size = "md",
}: {
  photoUrl: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const sz = size === "lg" ? "size-14" : size === "sm" ? "size-8" : "size-10";
  const validSrc = photoUrl && photoUrl.trim().length > 0 ? photoUrl : null;
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-full", sz)}>
      {validSrc ? (
        <Image src={validSrc} alt={name} fill className="object-cover" />
      ) : (
        <Initials name={name || "?"} />
      )}
    </div>
  );
}

// ─── Rank badge ───────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  const gold = rank === 1;
  const silver = rank === 2;
  const bronze = rank === 3;
  return (
    <div
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
        gold && "bg-yellow-400 text-yellow-900",
        silver && "bg-slate-300 text-slate-700",
        bronze && "bg-orange-300 text-orange-900",
        !gold && !silver && !bronze && "bg-muted text-muted-foreground",
      )}
    >
      {rank}
    </div>
  );
}

// ─── Candidate card (left panel) ──────────────────────────────────────────────

function CandidateCard({
  candidate,
  selected,
  onClick,
}: {
  candidate: RankedCandidate;
  selected: boolean;
  onClick: () => void;
}) {
  const displayName =
    [candidate.first_name, candidate.last_name].filter(Boolean).join(" ") ||
    candidate.email;

  const completedAt = candidate.interview?.completed_at;
  const timeLabel = completedAt
    ? formatDistanceToNow(new Date(completedAt), { addSuffix: true })
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-full rounded-xl border p-3 text-left transition-colors hover:bg-muted/50",
        selected && "border-primary/40 bg-primary/5",
      )}
    >
      {/* Timestamp — pinned to top-right corner of the card */}
      {timeLabel && (
        <span className="absolute right-3 top-3 text-[11px] text-muted-foreground">
          {timeLabel}
        </span>
      )}

      <div className="flex items-start gap-3">
        {/* Small avatar */}
        <Avatar photoUrl={candidate.photo_url} name={displayName} size="sm" />

        <div className="min-w-0 flex-1 pr-20">
          {/* Row 1: name */}
          <p className="truncate text-sm font-semibold leading-tight">{displayName}</p>

          {/* Row 2: email */}
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {candidate.email}
          </p>

          {/* Row 3: rank · score */}
          <div className="mt-1.5 flex items-center gap-1.5">
            <RankBadge rank={candidate.rank} />
            {candidate.averageScore != null ? (
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] font-bold tabular-nums",
                  getScoreBg(candidate.averageScore),
                )}
              >
                {candidate.averageScore.toFixed(1)} / 5
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">No score yet</span>
            )}
          </div>

          {/* Row 4: stage + decision badges */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StagePill stage={candidate.stage} />
            {candidate.interview?.result && (
              <DecisionPill decision={candidate.interview.result.toUpperCase()} />
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function StagePill({ stage }: { stage: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
      {stage}
    </span>
  );
}

function DecisionPill({ decision }: { decision: string }) {
  const pass = decision === "PASS";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        pass ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
      )}
    >
      {pass ? (
        <CheckCircleIcon className="size-2.5" />
      ) : (
        <XCircleIcon className="size-2.5" />
      )}
      {decision}
    </span>
  );
}

// ─── Detail panel (right) ─────────────────────────────────────────────────────

function NoSelection() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <ChevronLeftIcon className="size-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">
        Select a candidate to view their interview results
      </p>
    </div>
  );
}

function NoInterview({ name }: { name: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <ClipboardListIcon className="size-8 text-muted-foreground/40" />
      <p className="text-sm font-medium">{name}</p>
      <p className="text-xs text-muted-foreground">
        No interview has been completed yet.
      </p>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = Math.round((score / 5) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="capitalize text-muted-foreground">{label}</span>
        <span className={cn("font-semibold tabular-nums", getScoreColor(score))}>
          {score.toFixed(1)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", getScoreBarColor(score))}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function BulletSection({
  title,
  items,
  icon: Icon,
  destructive,
}: {
  title: string;
  items?: string[];
  icon: React.ElementType;
  destructive?: boolean;
}) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <Icon
          className={cn(
            "size-3.5",
            destructive ? "text-red-500" : "text-muted-foreground",
          )}
        />
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            destructive ? "text-red-600" : "text-muted-foreground",
          )}
        >
          {title}
        </p>
      </div>
      <ul className="space-y-1.5">
        {items.map((s, i) => (
          <li
            key={i}
            className={cn(
              "rounded-md border px-3 py-2 text-sm",
              destructive
                ? "border-red-100 bg-red-50 text-red-700"
                : "bg-muted/40 text-foreground",
            )}
          >
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CandidateDetail({ candidate }: { candidate: RankedCandidate }) {
  const router = useRouter();
  const [regenerating, setRegenerating] = useState(false);
  const displayName =
    [candidate.first_name, candidate.last_name].filter(Boolean).join(" ") ||
    candidate.email;

  if (!candidate.interview) return <NoInterview name={displayName} />;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const feedback = parseInterviewFeedback(candidate.interview.feedback as any);

  return (
    // h-full + overflow-y-auto here — the panel itself is the scroll container
    <div className="flex h-full flex-col overflow-hidden">
      {/* Sticky header inside the scrollable detail */}
      <div className="shrink-0 border-b bg-background px-5 py-4">
        <div className="flex items-center gap-3">
          <Avatar photoUrl={candidate.photo_url} name={displayName} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">{displayName}</h2>
              {feedback?.decision && (
                <Badge
                  variant={feedback.decision === "PASS" ? "default" : "destructive"}
                  className="text-xs"
                >
                  {feedback.decision}
                </Badge>
              )}
              {feedback?.average_score != null && (
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-sm font-bold tabular-nums",
                    getScoreBg(feedback.average_score),
                  )}
                >
                  {feedback.average_score.toFixed(1)} / 5
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {candidate.email}
            </p>
            {candidate.interview.completed_at && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Completed{" "}
                {format(
                  new Date(candidate.interview.completed_at),
                  "MMM d, yyyy 'at' h:mm a",
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 px-5 py-5">
          {!feedback ? (
            candidate.interview.feedback_status === "failed" ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Interview feedback failed to generate.
                </p>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    "hover:bg-muted",
                    regenerating && "pointer-events-none opacity-60",
                  )}
                  onClick={async () => {
                    if (regenerating) return;
                    setRegenerating(true);
                    try {
                      const res = await fetch("/api/ai/interviews/feedback", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ interviewId: candidate.interview?.id }),
                      });
                      // Consume the stream so the server can finish + persist.
                      await res.text();
                      router.refresh();
                    } finally {
                      setRegenerating(false);
                    }
                  }}
                >
                  <RefreshCwIcon className={cn("size-4", regenerating && "animate-spin")} />
                  Regenerate feedback
                </button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Interview feedback is being processed.
              </p>
            )
          ) : (
            <>
              {feedback.summary && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Summary
                  </p>
                  <p className="text-sm leading-relaxed text-foreground">
                    {feedback.summary}
                  </p>
                </div>
              )}

              {feedback.scores.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Score breakdown
                  </p>
                  <div className="space-y-3">
                    {feedback.scores.map((entry, i) => (
                      <ScoreBar
                        key={`${entry.label}-${i}`}
                        label={entry.label}
                        score={entry.score}
                      />
                    ))}
                  </div>
                </div>
              )}

              <BulletSection
                title="Strengths"
                items={feedback.strengths}
                icon={CheckCircleIcon}
              />
              <BulletSection
                title="Areas for improvement"
                items={feedback.weaknesses}
                icon={UserIcon}
              />
              <BulletSection
                title="Risk flags"
                items={feedback.risk_flags}
                icon={AlertTriangleIcon}
                destructive
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  screening: ScreeningRow;
  candidates: CandidateWithResult[];
};

export function EvaluateClient({ screening, candidates }: Props) {
  const ranked: RankedCandidate[] = candidates
    .map((c) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const feedback = c.interview
        ? parseInterviewFeedback(c.interview.feedback as any)
        : null;
      return { ...c, averageScore: feedback?.average_score ?? null };
    })
    .sort((a, b) => {
      if (a.averageScore == null && b.averageScore == null) return 0;
      if (a.averageScore == null) return 1;
      if (b.averageScore == null) return -1;
      return b.averageScore - a.averageScore;
    })
    .map((c, i) => ({ ...c, rank: i + 1 }));

  const [selectedId, setSelectedId] = useState<string | null>(
    ranked[0]?.id ?? null,
  );

  const selected = ranked.find((c) => c.id === selectedId) ?? null;

  return (
    // h-svh gives this component full viewport height as a standalone page
    <div className="flex h-svh flex-col" data-full-bleed>

      {/* Top bar — fixed height, never scrolls */}
      <div className="flex shrink-0 items-center gap-3 border-b px-5 py-3">
        <BackLink
          backHref={`/dashboard/screenings/${screening.id}`}
          title={screening.title}
        />
      </div>

      {/* Panels fill all remaining height below the top bar */}
      {/* FIX: `direction` not `orientation` — ResizablePanelGroup uses `direction` prop */}
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">

        {/* ── Left: candidate list ── */}
        <ResizablePanel defaultSize={300} minSize={300} maxSize={400}>
          {/* h-full so the inner flex column fills the panel */}
          <div className="flex h-full flex-col overflow-hidden border-r">
            <div className="shrink-0 border-b px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {ranked.length} candidate{ranked.length !== 1 ? "s" : ""} · ranked by score
              </p>
            </div>
            {/* overflow-y-auto on this div makes the list scroll independently */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-2 p-3">
                {ranked.map((c) => (
                  <CandidateCard
                    key={c.id}
                    candidate={c}
                    selected={c.id === selectedId}
                    onClick={() => setSelectedId(c.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* ── Right: detail ── */}
        <ResizablePanel defaultSize={70} minSize={40}>
          {/* overflow-hidden here — CandidateDetail manages its own scroll */}
          <div className="h-full overflow-hidden">
            {selected ? (
              <CandidateDetail candidate={selected} />
            ) : (
              <NoSelection />
            )}
          </div>
        </ResizablePanel>

      </ResizablePanelGroup>
    </div>
  );
}