import "server-only";

import type Stripe from "stripe";

export async function handleIdentityVerificationSessionRequiresInput(session: Stripe.Identity.VerificationSession): Promise<void> {
    console.log("handleIdentityVerificationSessionRequiresInput", session);

    if (session.last_error) {
        console.log('Verification check failed: ' + session.last_error.reason);

        // Handle specific failure reasons
        switch (session.last_error.code) {
            case 'document_unverified_other': {
                // The document was invalid
                break;
            }
            case 'document_expired': {
                // The document was expired
                break;
            }
            case 'document_type_not_supported': {
                // document type not supported
                break;
            }
            default: {

            }
        }
    }
}