"use server";

import type Stripe from "stripe";
import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/services/supabase/server";
import { getStripeServer } from "@/services/stripe/server";
import { env } from "@/data/env/server";

/**
 * Reconciles the Supabase user row when Firebase already has a verified
 * phone number (e.g. a returning user whose DB row hasn't caught up).
 */
export async function syncPhoneFromAuth(phoneNumber: string): Promise<void> {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const supabase = await createAdminClient();
    const { error } = await supabase
        .from("users")
        .update({ is_phone_verified: true, phone_number: phoneNumber })
        .eq("id", session.userId);

    if (error) {
        throw new Error(`Failed to sync phone: ${error.message}`);
    }
}

/**
 * Reconciles the Supabase user row when Firebase already has a verified
 * email address (e.g. a returning user whose DB row hasn't caught up).
 */
export async function syncEmailFromAuth(email: string): Promise<void> {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const supabase = await createAdminClient();
    const { error } = await supabase
        .from("users")
        .update({ is_email_verified: true, email })
        .eq("id", session.userId);

    if (error) {
        throw new Error(`Failed to sync email: ${error.message}`);
    }
}

export async function createIdentityVerificationSession(): Promise<
    | { data: { url: string; verified?: never }; error?: never }
    | { data: { verified: true; url?: never }; error?: never }
    | { error: string; data?: never }
> {
    const authSession = await getSession();
    if (!authSession) return { error: "Unauthenticated" };
    if (authSession.role !== "worker") return { error: "Unauthorized" };

    const userId = authSession.userId;
    const supabase = await createAdminClient();

    // ── 1. Try to resume an existing session ──────────────────────────────────
    // If the worker has already started a session, retrieve it from Stripe
    // instead of creating a new one. Only fall back to creation when the
    // session is no longer actionable (processing, verified, canceled) or when
    // the Stripe retrieval itself fails.
    const { data: existing, error: fetchError } = await supabase
        .from("identity_verification")
        .select("session_id, verified")
        .eq("user_id", userId)
        .maybeSingle();

    if (fetchError) return { error: fetchError.message };

    if (existing?.verified) return { error: "Identity already verified" };

    if (existing?.session_id) {
        try {
            const existing_session = await getStripeServer().identity.verificationSessions.retrieve(
                existing.session_id,
            );

            // requires_input is the only status where the session URL is still
            // active and the user can proceed — all other statuses need a new session.
            console.log("existing_session", existing_session);
            if (existing_session.status === "requires_input" && existing_session.url) {
                return { data: { url: existing_session.url } };
            }

            if (existing_session.status === "verified") {
                const { error: updateError } = await supabase
                    .from("identity_verification")
                    .update({
                        verified: true,
                        verified_at: new Date().toISOString(),
                    })
                    .eq("session_id", existing.session_id);

                if (updateError) {
                    console.error("[createIdentityVerificationSession] DB update error", updateError);
                    return { error: "Failed to record verification session. Please try again." };
                }

                // Signal the caller that the worker is already verified —
                // no redirect needed, just a page refresh.
                return { data: { verified: true } };
            }
        } catch (err) {
            // Retrieval failed (e.g. session deleted by Stripe, network error)
            // — fall through to create a fresh session
            console.warn(
                "[createIdentityVerificationSession] Could not retrieve existing session — creating new one",
                { sessionId: existing.session_id, error: err instanceof Error ? err.message : err },
            );
        }
    }

    // ── 2. Create a new Stripe Identity session ───────────────────────────────
    // session.userId is already the users.id — no extra DB lookup needed.
    let verificationSession: Stripe.Identity.VerificationSession;
    try {
        verificationSession = await getStripeServer().identity.verificationSessions.create({
            type: "document",
            client_reference_id: userId,
            return_url: `${env.APP_URL}/dashboard/compliance`,
            metadata: { user_id: userId },
        });
    } catch (err) {
        console.error("[createIdentityVerificationSession] Stripe create error", err);
        return { error: "Failed to create verification session. Please try again." };
    }

    if (!verificationSession.url) {
        return { error: "Stripe did not return a verification URL. Please try again." };
    }

    // ── 3. Persist — upsert so retries update the session_id in place ─────────
    const { error: upsertError } = await supabase
        .from("identity_verification")
        .upsert(
            {
                user_id: userId,
                session_id: verificationSession.id,
                verified: false,
                verified_at: null,
            },
            { onConflict: "user_id" },
        );

    if (upsertError) {
        console.error("[createIdentityVerificationSession] DB upsert error", upsertError);
        return { error: "Failed to record verification session. Please try again." };
    }

    return { data: { url: verificationSession.url } };
}