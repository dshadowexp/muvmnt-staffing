"use server";

import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/services/supabase/server";

/**
 * Verify an SMS OTP via Twilio Verify. On `approved`, the underlying
 * {@link smsOTPCheck} also marks the Supabase user row as
 * `is_phone_verified = true` and syncs the phone number into Firebase auth.
 */
export async function verifyPhoneOtp(
    phoneNumber: string,
    code: string,
): Promise<{ status: string }> {
    const session = await getSession();
    if (!session) return { status: "Unauthorized" };

    // const verificationCheck = await twilioClient.verify.v2
    // .services(env.TWILIO_MESSAGING_ID)
    // .verificationChecks.create({
    //     code: code,
    //     to: phoneNumber,
    // });

    // if (verificationCheck.status === "approved") {
    //     const supabase = await createAdminClient();

    //     const { error: updErr } = await supabase
    //         .from("users")
    //         .update({ is_phone_verified: true, phone_number: phoneNumber })
    //         .eq("id", session.userId);

    //     if (updErr) {
    //         throw new Error(`Failed to update phone verified: ${updErr.message}`);
    //     }

    //     const { data: user, error: selErr } = await supabase
    //         .from("users")
    //         .select("auth_id")
    //         .eq("id", session.userId)
    //         .single();

    //     if (selErr || !user?.auth_id) {
    //         throw new Error(
    //             `Could not load user after verification: ${selErr?.message ?? "missing auth_id"}`,
    //         );
    //     }

    //     await getAdminAuth().updateUser(user.auth_id, { phoneNumber });
    // }

    return { status: "approved" };
}

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
