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
    status:         "enqueued";
    idempotencyKey: string;
    runId:          string;
};

function canonicalJson(value: unknown): string {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
    const entries = Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`);
    return `{${entries.join(",")}}`;
}

function deriveIdempotencyKey(userId: string, channels: unknown[]): string {
    const canonical = canonicalJson({ userId, channels });
    return createHash("sha256").update(canonical).digest("hex");
}

export async function enqueueNotification(
    input: EnqueueNotificationInput,
): Promise<EnqueueNotificationResult> {
    const parsed = enqueueNotificationSchema.parse(input);

    const idempotencyKey =
        parsed.idempotencyKey ??
        deriveIdempotencyKey(parsed.userId, parsed.channels);

    const jobPayload: SendNotificationJobPayload = {
        userId:         parsed.userId,
        channels:       parsed.channels,
        idempotencyKey,
    };

    const templates = [...new Set(parsed.channels.map((c) => c.template))];
    const channelTypes = parsed.channels.map((c) => c.channel);

    const handle = await tasks.trigger<typeof sendNotificationTask>(
        "notifications.send",
        jobPayload,
        {
            idempotencyKey,
            delay: parsed.delayMs ? `${parsed.delayMs}ms` : undefined,
            tags: [
                ...templates.map((t) => `template_${t.replace(/[^a-zA-Z0-9_-]/g, "_")}`),
                ...channelTypes.map((c) => `channel_${c}`),
            ],
        },
    );

    return { status: "enqueued", idempotencyKey, runId: handle.id };
}