/** Canonical ordering for UI and progression checks — matches DB CHECK on workers.stage. */
export const WORKER_STAGE_ORDER = [
  "interview",
  "compliance",
  "payroll",
  "availability",
  "live",
] as const;

export type WorkerLifecycleStage = (typeof WORKER_STAGE_ORDER)[number];

export function isWorkerLifecycleStage(s: string): s is WorkerLifecycleStage {
  return (WORKER_STAGE_ORDER as readonly string[]).includes(s);
}
