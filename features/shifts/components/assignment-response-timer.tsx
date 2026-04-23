"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

const RESPONSE_WINDOW_MS = 30 * 60 * 1000;

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AssignmentResponseTimer({
  assignedAtIso,
}: {
  assignedAtIso: string;
}) {
  const t = useTranslations("dashboard.worker.home.shiftRequests");
  const deadlineMs = React.useMemo(() => {
    const start = new Date(assignedAtIso).getTime();
    if (!Number.isFinite(start)) return null;
    return start + RESPONSE_WINDOW_MS;
  }, [assignedAtIso]);

  /** `null` until after mount so SSR + first client paint match (avoids Date.now hydration mismatch). */
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (deadlineMs == null) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [deadlineMs]);

  if (deadlineMs == null) {
    return (
      <span className="text-muted-foreground text-xs tabular-nums">—</span>
    );
  }

  if (now === null) {
    return (
      <span className="text-amber-600 dark:text-amber-500 text-xs font-medium tabular-nums">
        —
      </span>
    );
  }

  const remaining = deadlineMs - now;
  const expired = remaining <= 0;

  return (
    <span
      className={
        expired
          ? "text-muted-foreground text-xs font-medium tabular-nums"
          : "text-amber-600 dark:text-amber-500 text-xs font-medium tabular-nums"
      }
    >
      {expired ? t("timerExpired") : t("timerRemaining", { time: formatRemaining(remaining) })}
    </span>
  );
}
