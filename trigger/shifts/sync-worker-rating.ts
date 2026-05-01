import { logger, task } from "@trigger.dev/sdk/v3";
import { z } from "zod";

import { createAdminClient } from "@/supabase/server";

export const syncWorkerRatingPayloadSchema = z.object({
    /** workers.id (the internal UUID, not the Firebase user id). */
    workerId: z.string().uuid(),
});
export type SyncWorkerRatingPayload = z.infer<typeof syncWorkerRatingPayloadSchema>;

/**
 * Recomputes `workers.rating_avg` and `workers.rating_count` from the full
 * `shift_ratings` history for a single worker and writes the result atomically.
 *
 * Design decisions:
 *  - **Ground-up recompute, not incremental delta** — always derives the true
 *    aggregate so the worker row stays consistent even when ratings are edited
 *    or deleted.
 *  - **Idempotent** — safe to run multiple times; the result is always the same
 *    for a given state of `shift_ratings`.
 *  - **Triggered via idempotency key** — rapid re-ratings (client edits within
 *    seconds) collapse into a single DB round-trip instead of N racing updates.
 *  - **Decoupled from the write path** — `rateClientShift` returns immediately;
 *    the worker row is updated asynchronously without blocking the client.
 */
export const syncWorkerRatingTask = task({
    id: "shifts.sync-worker-rating",
    maxDuration: 30,
    retry: {
        maxAttempts: 5,
        minTimeoutInMs: 1_000,
        maxTimeoutInMs: 30_000,
        factor: 2,
        randomize: true,
    },
    run: async (raw: SyncWorkerRatingPayload) => {
        const { workerId } = syncWorkerRatingPayloadSchema.parse(raw);

        const supabase = await createAdminClient();

        // ── 1. Aggregate all ratings for this worker ──────────────────────────
        const { data: ratings, error: fetchErr } = await supabase
            .from("shift_ratings")
            .select("rating")
            .eq("worker_id", workerId);

        if (fetchErr) throw new Error(`Failed to fetch ratings: ${fetchErr.message}`);

        const count = ratings?.length ?? 0;
        const avg =
            count > 0
                ? Math.round(
                      (ratings.reduce((sum, r) => sum + r.rating, 0) / count) * 100,
                  ) / 100
                : null;

        logger.log("shifts.sync-worker-rating: computed aggregate", {
            workerId,
            count,
            avg,
        });

        // ── 2. Write back to workers row ──────────────────────────────────────
        const { error: updateErr } = await supabase
            .from("workers")
            .update({
                rating_avg:   avg,
                rating_count: count,
            })
            .eq("id", workerId);

        if (updateErr) throw new Error(`Failed to update worker rating: ${updateErr.message}`);

        return { workerId, count, avg };
    },
});
