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

const PAYROLL_STAGE_INDEX = WORKER_STAGE_ORDER.indexOf("payroll");

/** Payroll dashboard unlocks at `payroll` and stays available through `availability` and `live`. */
export function isPayrollSectionUnlocked(stage: string | null | undefined): boolean {
  if (stage == null || stage === "") return false;
  if (!isWorkerLifecycleStage(stage)) return false;
  return WORKER_STAGE_ORDER.indexOf(stage) >= PAYROLL_STAGE_INDEX;
}
