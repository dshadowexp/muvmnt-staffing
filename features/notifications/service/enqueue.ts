import "server-only";

import { createHash } from "node:crypto";
import { tasks } from "@trigger.dev/sdk/v3";

import {
    enqueueNotificationSchema,
    type EnqueueNotificationInput,
    type SendNotificationJobPayload,
} from "./schemas";

import type { sendNotificationTask } from "@/trigger/notifications/send-notification";

export type EnqueueNotificationResult = {
    status: "enqueued";
    idempotencyKey: string;
    runId: string;
};

/**
 * Canonical JSON for deriving a stable idempotency key. Object keys are
 * sorted recursively so `{a:1,b:2}` and `{b:2,a:1}` hash identically.
 */
function canonicalJson(value: unknown): string {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
    const entries = Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`);
    return `{${entries.join(",")}}`;
}

function deriveIdempotencyKey(input: {
    userId: string;
    template: string;
    channels: readonly string[];
    data: Record<string, unknown>;
}): string {
    const canonical = canonicalJson({
        userId: input.userId,
        template: input.template,
        channels: [...input.channels].sort(),
        data: input.data,
    });
    return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Public entrypoint for sending a notification.
 *
 * Does exactly two things on the hot path:
 *   1. Validate + normalise the payload.
 *   2. Trigger the Trigger.dev task, keyed on idempotency so that retries
 *      from anywhere (client, caller, Stripe-style redelivery) collapse to
 *      a single run.
 *
 * User contact lookup + channel fan-out happen inside the task so this
 * function stays sub-100ms and safe to call from any server component /
 * route handler.
 */
export async function enqueueNotification(
    input: EnqueueNotificationInput,
): Promise<EnqueueNotificationResult> {
    const parsed = enqueueNotificationSchema.parse(input);

    const idempotencyKey =
        parsed.idempotencyKey ??
        deriveIdempotencyKey({
            userId: parsed.userId,
            template: parsed.template,
            channels: parsed.channels,
            data: parsed.data,
        });

    const jobPayload: SendNotificationJobPayload = {
        userId: parsed.userId,
        channels: parsed.channels,
        subject: parsed.subject,
        template: parsed.template,
        data: parsed.data,
        idempotencyKey,
    };

    const handle = await tasks.trigger<typeof sendNotificationTask>(
        "notifications.send",
        jobPayload,
        {
            idempotencyKey,
            delay: parsed.delayMs ? `${parsed.delayMs}ms` : undefined,
            tags: [
                `notification_template_${parsed.template.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
                ...parsed.channels.map((c) => `notification_channel_${c}`),
            ],
        },
    );

    return { status: "enqueued", idempotencyKey, runId: handle.id };
}
