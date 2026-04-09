import { twilioClient } from "./client";
import { env } from "@/data/env/server";

export async function smsOTP(phoneNumber: string) {
    const verification = await twilioClient.verify.v2
        .services(env.TWILIO_MESSAGING_ID)
        .verifications.create({
            channel: "sms",
            to: phoneNumber,
        });

    return { status: verification.status };
}

export async function smsOTPCheck(userId: string, phoneNumber: string, code: string) {
    const verificationCheck = await twilioClient.verify.v2
        .services(env.TWILIO_MESSAGING_ID)
        .verificationChecks.create({
            code: code,
            to: phoneNumber,
        });

    // if (verificationCheck.status === 'approved') {
    //     await this.repo.updatePhoneVerified(userId, phoneNumber);
    //     const user = await this.repo.findById(userId);
    //     await updateFirebaseUser(user!.auth_id, phoneNumber);
    // }

    return { status: verificationCheck.status };
}

export async function sendSms(to: string | null, body: string): Promise<void> {
    if (!to) {
        throw new Error('No phone number provided')
    }

    await twilioClient.messages.create({
        to,
        from: env.TWILIO_FROM_NUMBER,
        body,
    });
}