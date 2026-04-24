"use server";

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

export async function createIdentityVerificationSession() {
    const session = await getSession();
    if (!session) return { error: "Unauthenticated" };

    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("users")
        .select("email, phone_number, id")
        .eq("id", session.userId)
        .maybeSingle();

    if (error && error.code !== "PGRST116") return { error: error.message };
    if (!data) return { error: "UserNotFound" };

    const verificationSession = await getStripeServer().identity.verificationSessions.create({
        verification_flow: env.STRIPE_IDENTITY_VERIFICATION_FLOW_ID,
        client_reference_id: data.id,
    });

    return { data: { url: verificationSession.url } };
}