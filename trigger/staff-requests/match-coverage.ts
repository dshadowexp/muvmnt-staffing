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
                step:   "locating",
                label:  "Pinpointing your location",
                detail: event.cellId
                    ? "Location confirmed — starting nearby search."
                    : "No address on file. Add one to continue.",
            };
        case "ring":
            return {
                step:         "ring",
                label:        "Scanning your area for workers",
                detail:       `Searching across ${event.ringCellCount} zones near your location`,
                ringCellCount: event.ringCellCount,
            };
        case "workers":
            return {
                step:        "workers",
                label:       "Finding workers nearby",
                detail:      `${event.workerCount} active worker${event.workerCount === 1 ? "" : "s"} found in range`,
                workerCount: event.workerCount,
            };
        case "availability":
            return {
                step:   "availability",
                label:  "Checking their schedules",
                detail: `Reviewing ${event.availabilityRows} published availability windows`,
            };
        case "filter":
            return {
                step:           "filter",
                label:          "Matching your requirements",
                detail:         `${event.remaining} of ${event.before} workers qualify for the ${event.tierId} tier`,
                candidateCount: event.remaining,
            };
        case "expanding":
            return {
                // Stays on "scheduling" visually so completed step rows don't reset.
                step:   "scheduling",
                label:  "Expanding search radius",
                detail: `No full coverage yet — broadening to a wider area (pass ${event.ringIndex + 1} of ${event.totalRings})`,
            };
        case "scheduling":
            return {
                step:   "scheduling",
                label:  "Building your coverage plan",
                detail: `Arranging shifts across ${event.days} day${event.days === 1 ? "" : "s"}`,
            };
        case "done":
            return {
                step:           "done",
                label:          event.result.fullyCovered
                    ? "Full coverage found"
                    : "Best-effort coverage found",
                detail:         `${event.result.totalWorkers} worker${event.result.totalWorkers === 1 ? "" : "s"} assigned · ${
                    event.result.fullyCovered ? "all shifts covered" : "partial coverage — consider adjusting your schedule"
                }`,
                candidateCount: event.result.candidateCount,
                ringCellCount:  event.result.ringCellCount,
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
        maxAttempts: 1,
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
