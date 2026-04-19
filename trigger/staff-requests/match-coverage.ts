import { logger, metadata, task } from "@trigger.dev/sdk/v3";
import { z } from "zod";

import { runMatchForStaffRequest } from "@/features/requests/server/staff-request";
import type { MatchProgressEvent } from "@/features/requests/server/matching";

export const matchCoveragePayloadSchema = z.object({
    requestId: z.string().min(1),
});
export type MatchCoveragePayload = z.infer<typeof matchCoveragePayloadSchema>;

/**
 * Realtime metadata shape consumed by `useRealtimeRun` on the coverage page.
 * Keep additive — the UI tolerates missing keys, but breaking renames force a
 * client release.
 */
export type MatchCoverageProgress = {
    step:
        | "queued"
        | "locating"
        | "ring"
        | "workers"
        | "availability"
        | "filter"
        | "scheduling"
        | "done";
    label: string;
    detail?: string;
    workerCount?: number;
    candidateCount?: number;
    ringCellCount?: number;
};

function describe(event: MatchProgressEvent): MatchCoverageProgress {
    switch (event.kind) {
        case "locating":
            return {
                step: "locating",
                label: "Locating your business",
                detail: event.cellId
                    ? "Got the geo cell — searching the surrounding area."
                    : "We can't find an address on file. Add one to keep going.",
            };
        case "ring":
            return {
                step: "ring",
                label: "Mapping the search radius",
                detail: `${event.ringCellCount} geo cells in range`,
                ringCellCount: event.ringCellCount,
            };
        case "workers":
            return {
                step: "workers",
                label: "Loading available workers nearby",
                detail: `${event.workerCount} workers found`,
                workerCount: event.workerCount,
            };
        case "availability":
            return {
                step: "availability",
                label: "Reading their published availability",
                detail: `${event.availabilityRows} availability windows`,
            };
        case "filter":
            return {
                step: "filter",
                label: "Applying your tier filters",
                detail: `${event.remaining} of ${event.before} workers match the ${event.tierId} tier`,
                candidateCount: event.remaining,
            };
        case "scheduling":
            return {
                step: "scheduling",
                label: "Building the daily coverage plan",
                detail: `${event.days} days to cover`,
            };
        case "done":
            return {
                step: "done",
                label: event.result.fullyCovered
                    ? "Coverage ready"
                    : "Best-effort coverage ready",
                detail: `${event.result.totalWorkers} unique workers · ${
                    event.result.fullyCovered ? "fully covered" : "partial coverage"
                }`,
                candidateCount: event.result.candidateCount,
                ringCellCount: event.result.ringCellCount,
            };
    }
}

/**
 * Long-running staff-request matching task. Streams progress via
 * `metadata.set("progress", …)` so the UI can render each step with
 * `useRealtimeRun`.
 */
export const matchCoverageTask = task({
    id: "staff-requests.match-coverage",
    maxDuration: 300,
    retry: {
        maxAttempts: 2,
        minTimeoutInMs: 5_000,
        maxTimeoutInMs: 30_000,
        factor: 2,
        randomize: true,
    },
    run: async (raw: MatchCoveragePayload) => {
        const payload = matchCoveragePayloadSchema.parse(raw);
        logger.log("Matching coverage for staff request", {
            requestId: payload.requestId,
        });

        await metadata.set("progress", {
            step: "queued",
            label: "Starting coverage matching",
        } satisfies MatchCoverageProgress);

        const result = await runMatchForStaffRequest({
            requestId: payload.requestId,
            progress: async (event) => {
                await metadata.set("progress", describe(event));
            },
        });

        if (!result.ok) {
            await metadata.set("progress", {
                step: "done",
                label: "Coverage failed",
                detail: result.message,
            } satisfies MatchCoverageProgress);
            throw new Error(result.message);
        }

        return {
            requestId: payload.requestId,
            cache: result.cache,
        };
    },
});
