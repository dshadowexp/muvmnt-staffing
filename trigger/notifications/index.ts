/**
 * Registry of notification Trigger.dev tasks.
 *
 * Re-exports every task so Trigger.dev's file-based discovery has a single
 * place to pull type-safe task handles from at call sites.
 */
export { sendNotificationTask } from "./send-notification";
