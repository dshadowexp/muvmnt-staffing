"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { WORKER_STAGE_ORDER } from "@/features/workers/lib/worker-stage-order";

const ACCENT_RING: Record<string, string> = {
  interview: "border-teal-500/40 bg-teal-500/10 text-teal-800 dark:text-teal-200",
  compliance: "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-200",
  payroll: "border-violet-500/40 bg-violet-500/10 text-violet-800 dark:text-violet-200",
  availability: "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  live: "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
};

const MUTED = "border-border/80 bg-muted/40 text-muted-foreground";

export function WorkerStageStrip({ stage }: { stage: string }) {
  const t = useTranslations("dashboard.worker.stages");
  const currentIdx = WORKER_STAGE_ORDER.indexOf(
    stage as (typeof WORKER_STAGE_ORDER)[number],
  );
  const safeIdx = currentIdx >= 0 ? currentIdx : 0;

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label={t("ariaLabel")}
    >
      {WORKER_STAGE_ORDER.map((s, i) => {
        const isPast = i < safeIdx;
        const isCurrent = i === safeIdx;
        const accent = ACCENT_RING[s] ?? MUTED;
        return (
          <span
            key={s}
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em]",
              isCurrent && accent,
              !isCurrent && isPast && "border-primary/25 bg-primary/5 text-foreground/70",
              !isCurrent && !isPast && MUTED,
            )}
          >
            {t(s)}
          </span>
        );
      })}
    </div>
  );
}
