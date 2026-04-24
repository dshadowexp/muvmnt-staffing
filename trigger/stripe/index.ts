/**
 * Registry of all Stripe webhook Trigger.dev tasks.
 *
 * Re-exports every task so Trigger.dev's file-based discovery (see
 * `trigger.config.ts` `dirs`) has a single place to pull type-safe task
 * handles from in the HTTP webhook route.
 */
export { stripeAccountUpdatedTask } from "./account-updated";
export { stripeCheckoutSessionCompletedTask } from "./checkout-session-completed";
export { stripeIdentityVerificationSessionRequiresInputTask, stripeIdentityVerificationSessionVerifiedTask } from "./identity-verification-session";
