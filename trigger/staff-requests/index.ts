/**
 * Registry of staff-request Trigger.dev tasks.
 *
 * Re-exports keep the file-discovery scan in `trigger.config.ts` happy and
 * give server actions one canonical place to import type-safe task handles
 * from when calling `tasks.trigger`.
 */
export { matchCoverageTask } from "./match-coverage";
export type {
    MatchCoveragePayload,
    MatchCoverageProgress,
} from "./match-coverage";

export { confirmAndChargeTask } from "./confirm-and-charge";
export type {
    ConfirmAndChargePayload,
    ConfirmAndChargeProgress,
} from "./confirm-and-charge";

export { finalizeAfterCheckoutTask } from "./finalize-after-checkout";
export type { FinalizeAfterCheckoutPayload } from "./finalize-after-checkout";
