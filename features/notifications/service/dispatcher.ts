import "server-only";

import { createAdminClient } from "@/services/supabase/server";
import { EmailChannel } from "../channels/email.channel";
import { PushChannel } from "../channels/push.channel";
import { SmsChannel } from "../channels/sms.channel";
import type {
    NotificationChannel,
    SendNotificationJobPayload,
} from "./schemas";

type UserContact = {
    email: string | null;
    phone_number: string | null;
    push_token: string | null;
};

/**
 * Lazy per-process channel instances.
 *
 * Channels hold handles to expensive clients (nodemailer transporter,
 * firebase-admin messaging, twilio). Instantiating once per Node process
 * keeps cold starts and per-message overhead low.
 */
let channels: { email: EmailChannel; sms: SmsChannel; push: PushChannel } | null = null;
function getChannels() {
    if (!channels) {
        channels = {
            email: new EmailChannel(),
            sms: new SmsChannel(),
            push: new PushChannel(),
        };
    }
    return channels;
}

async function lookupUserContact(userId: string): Promise<UserContact> {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("users")
        .select("email, phone_number, push_token")
        .eq("id", userId)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to load user ${userId}: ${error.message}`);
    }
    if (!data) {
        throw new Error(`User ${userId} not found`);
    }
    return data as UserContact;
}

export type ChannelResult =
    | { channel: NotificationChannel; status: "fulfilled" }
    | { channel: NotificationChannel; status: "rejected"; error: string };

/**
 * Deliver a notification across all requested channels.
 *
 * Designed to be called from inside a Trigger.dev task:
 *   - Uses `Promise.allSettled` so a single failing channel does not block
 *     the others.
 *   - Throws only if *every* channel fails, allowing Trigger.dev's retry
 *     policy to kick in without repeating already-successful channels.
 */
export async function deliverNotification(
    payload: SendNotificationJobPayload,
): Promise<ChannelResult[]> {
    const contact = await lookupUserContact(payload.userId);
    const { email, sms, push } = getChannels();

    const sends: Array<Promise<void> | Promise<unknown>> = payload.channels.map((channel) => {
        switch (channel) {
            case "email":
                return email.send({
                    to: contact.email ?? "",
                    subject: payload.subject ?? payload.template,
                    template: payload.template,
                    data: payload.data,
                });
            case "sms":
                return sms.send({
                    to: contact.phone_number,
                    template: payload.template,
                    data: payload.data,
                });
            case "push":
                return push.send({
                    token: contact.push_token ?? "",
                    template: payload.template,
                    data: payload.data,
                });
        }
    });

    const settled = await Promise.allSettled(sends);
    const results: ChannelResult[] = settled.map((r, i) => {
        const channel = payload.channels[i];
        if (r.status === "fulfilled") return { channel, status: "fulfilled" };
        return {
            channel,
            status: "rejected",
            error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        };
    });

    const anySucceeded = results.some((r) => r.status === "fulfilled");
    if (!anySucceeded) {
        const detail = results
            .map((r) => (r.status === "rejected" ? `${r.channel}:${r.error}` : r.channel))
            .join(" | ");
        throw new Error(`All notification channels failed — ${detail}`);
    }

    return results;
}
