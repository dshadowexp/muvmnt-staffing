/**
 * Registry of shift-cycle Trigger.dev tasks.
 *
 * Re-exports every task so the file-based discovery and consumer-side
 * `tasks.trigger<typeof xxxTask>(...)` calls have a single import surface.
 */
export { transferShiftTask } from "./transfer-shift";
export { payoutShiftTask } from "./payout-shift";
