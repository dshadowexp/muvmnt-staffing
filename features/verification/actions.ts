"use server";

import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { createIdentityVerificationSession } from "./dal/mutations";

export type IdentityVerificationActionState =
  | { error: string }
  | { refresh: true }
  | null;

export async function startIdentityVerificationAction(
  _prevState: IdentityVerificationActionState,
): Promise<IdentityVerificationActionState> {
  try {
    const result = await createIdentityVerificationSession();

    if (result.error) {
      console.error("[startIdentityVerificationAction] Session creation error", result.error);
      return { error: "Could not start identity verification. Please try again." };
    }

    // Worker was already verified on Stripe's side — update reflected in DB,
    // signal the client to refresh the page instead of redirecting to Stripe.
    if (result.data?.verified) {
      return { refresh: true };
    }

    redirect(result.data?.url ?? "");
  } catch (err) {
    // redirect() throws internally — must be re-thrown so Next.js can handle it
    if (isRedirectError(err)) throw err;

    console.error("[startIdentityVerificationAction] Unexpected error", err);
    return { error: "An unexpected error occurred. Please try again." };
  }
}
