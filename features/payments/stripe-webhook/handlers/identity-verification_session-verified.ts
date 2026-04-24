import "server-only";

import type Stripe from "stripe";

export async function handleIdentityVerificationSessionVerified(session: Stripe.Identity.VerificationSession): Promise<void> {
    console.log("handleIdentityVerificationSessionVerified", session);
}