"use server";

import { env } from "@/data/env/server";
import { getSession } from "@/lib/get-session";
import { twilioClient } from "@/services/twilio/client";

/**
 * Send an SMS OTP to the given phone number via Twilio Verify. Requires an
 * authenticated session — we only expose the OTP surface to signed-in users
 * to keep abuse off our Twilio bill.
 */
export async function sendPhoneOtp(
    phoneNumber: string,
): Promise<{ status: string }> {
    const session = await getSession();
    if (!session) return { status: "Unauthorized" };

    const verification = await twilioClient.verify.v2
        .services(env.TWILIO_MESSAGING_ID)
        .verifications.create({
            channel: "sms",
            to: phoneNumber,
        });

    return { status: verification.status };
}
