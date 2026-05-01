import { logger, task, tasks } from "@trigger.dev/sdk/v3";
import { z } from "zod";

import { createAdminClient } from "@/supabase/server";
import { env } from "@/data/env/server";
import { findFirstAvailableWorker } from "@/features/requests/server/matching";
import type { InsertedWorkerShift } from "@/features/requests/server/shifts";
import { shiftWindowFromTimestamps } from "@/features/shifts/lib/shift-time";
import {
    computeWorkerResponseWindow,
    offerWorkerDelayToTriggerDelay,
} from "@/features/shifts/lib/worker-response-window";
import { patchShiftById } from "@/features/shifts/dal/mutations";
import { getWorkerIdByUserId } from "@/features/shifts/dal/queries";
import { enqueueNotification } from "@/features/notifications/service/enqueue";
import { createShiftResponseToken } from "@/features/shifts/lib/shift-response-token";
import {
    formatShiftAssignedEmailPayload,
    shiftAssignedEmailSubject,
} from "@/features/shifts/server/shift-assigned-email-data";
import { SHIFT_STATUS_SCHEDULED } from "@/features/shifts/constants";

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_USER_ID = "2c1a6fa4-fed5-42ab-9191-25d1a1ab0499";

// ─── Schema ───────────────────────────────────────────────────────────────────

export const offerWorkerPayloadSchema = z.object({
    shiftId: z.string().uuid(),
});
export type OfferWorkerPayload = z.infer<typeof offerWorkerPayloadSchema>;

// ─── Task ─────────────────────────────────────────────────────────────────────

/**
 * Drives the worker-offer loop for a single shift.
 *
 * Flow:
 *   1. If the shift is no longer `scheduled`, bail — it's already confirmed or unfilled.
 *   2. Build the H3 candidate ring from the staff-request's `cell_id`.
 *   3. Find the next eligible worker not already in `offered_worker_ids`.
 *   4. If found: update the shift, send the offer email/push, re-schedule this task in 25 h.
 *   5. If not found: mark the shift `unfilled` and push-notify the admin.
 */
export const offerWorkerTask = task({
    id: "shifts.offer-worker",
    maxDuration: 120,
    retry: {
        maxAttempts: 2,
        minTimeoutInMs: 5_000,
        maxTimeoutInMs: 30_000,
        factor: 2,
        randomize: true,
    },
    run: async (raw: OfferWorkerPayload) => {
        const { shiftId } = offerWorkerPayloadSchema.parse(raw);

        const supabase = await createAdminClient();

        // ── 1. Load shift + staff-request ─────────────────────────────────────
        const { data: shiftRow, error: shiftErr } = await supabase
            .from("shifts")
            .select(`
                id,
                request_id,
                worker_id,
                status,
                start_time,
                end_time,
                hourly_rate,
                location,
                offered_worker_ids,
                staff_requests!inner (
                    cell_id,
                    pricing_tier,
                    profession,
                    requirements,
                    tasks
                )
            `)
            .eq("id", shiftId)
            .maybeSingle();

        if (shiftErr || !shiftRow) {
            logger.warn("shifts.offer-worker: shift not found", { shiftId });
            return;
        }

        // ── 2. Guard: only act on un-filled scheduled shifts ──────────────────
        if (shiftRow.status !== SHIFT_STATUS_SCHEDULED) {
            logger.log("shifts.offer-worker: shift not scheduled, skipping", {
                shiftId,
                status: shiftRow.status,
            });
            return;
        }

        const sr = shiftRow.staff_requests as {
            cell_id:      string | null;
            pricing_tier: string | null;
            profession:   string | null;
            requirements: string[] | null;
            tasks:        string[] | null;
        } | null;

        if (!sr?.cell_id || !sr.pricing_tier) {
            logger.warn("shifts.offer-worker: missing cell_id or pricing_tier", { shiftId });
            return;
        }

        // ── 3. Convert UTC timestamps → wall-clock window ─────────────────────
        const win = shiftWindowFromTimestamps(shiftRow.start_time, shiftRow.end_time);
        if (!win) {
            logger.warn("shifts.offer-worker: invalid shift timestamps", { shiftId });
            return;
        }

        // ── 4. Determine already-tried worker user-ids ────────────────────────
        const offeredIds: string[] = Array.isArray(shiftRow.offered_worker_ids)
            ? (shiftRow.offered_worker_ids as string[])
            : [];

        // ── 5. Find next eligible worker (all rings, broadest search) ─────────
        const nextUserIdOrNull = await findFirstAvailableWorker({
            cellId:        sr.cell_id,
            dateYmd:       win.dateYmd,
            startHHmm:     win.startHHmm,
            endHHmm:       win.endHHmm,
            pricingTierId: sr.pricing_tier,
            profession:    sr.profession ?? "",
            requirements:  sr.requirements ?? [],
            excludeUserIds: offeredIds,
        });

        // ── 7a. No workers left → unfilled + admin alert ──────────────────────
        if (!nextUserIdOrNull) {
            logger.log("shifts.offer-worker: no candidates, marking unfilled", { shiftId });

            await patchShiftById(shiftId, { status: "unfilled" });

            await enqueueNotification({
                userId:   ADMIN_USER_ID,
                channels: [{
                    channel:  "push",
                    template: "shift-unfilled",
                    data: {
                        shiftId,
                        requestId: shiftRow.request_id,
                        date:      win.dateYmd,
                        link:      `${env.APP_URL}/admin/shifts/${shiftId}`,
                    },
                }],
            }).catch((err) =>
                logger.error("shifts.offer-worker: admin notify failed", {
                    shiftId,
                    err: err instanceof Error ? err.message : String(err),
                }),
            );

            return;
        }

        const nextUserId = nextUserIdOrNull;

        // ── 7b. Resolve workers-table id ──────────────────────────────────────
        const newWorkerId = await getWorkerIdByUserId(nextUserId);
        if (!newWorkerId) {
            logger.error("shifts.offer-worker: next candidate has no worker row", {
                shiftId, nextUserId,
            });
            return;
        }

        // Fetch first name for the email greeting
        const { data: workerData } = await supabase
            .from("workers")
            .select("first_name")
            .eq("user_id", nextUserId)
            .maybeSingle();

        // ── 8. Update shift: new assignee + append to offered list ────────────
        const newOfferedIds = [...offeredIds, nextUserId];

        const patch = await patchShiftById(shiftId, {
            worker_id:          newWorkerId,
            offered_worker_ids: newOfferedIds,
        });

        if (!patch.ok) {
            logger.error("shifts.offer-worker: failed to patch shift", {
                shiftId,
                message: patch.message,
            });
            return;
        }

        // ── 9. Send offer email + push to new worker ──────────────────────────
        const location = shiftRow.location as { address: string; lat: number; lng: number } | null;
        const rate     = (shiftRow.hourly_rate as number | null) ?? 0;

        const [acceptToken, declineToken] = await Promise.all([
            createShiftResponseToken({ workerId: nextUserId, requestId: shiftRow.request_id, action: "accept"  }),
            createShiftResponseToken({ workerId: nextUserId, requestId: shiftRow.request_id, action: "decline" }),
        ]);

        const acceptUrl  = `${env.APP_URL}/api/shifts/respond?token=${acceptToken}`;
        const declineUrl = `${env.APP_URL}/api/shifts/respond?token=${declineToken}`;

        const startIso = shiftRow.start_time as string;
        const endIso = shiftRow.end_time as string;
        const requirements =
            Array.isArray(sr.requirements) ? (sr.requirements as string[]) : [];
        const requestTasks =
            Array.isArray(sr.tasks) ? (sr.tasks as string[]) : [];

        const insertedLike: InsertedWorkerShift = {
            userId:      nextUserId,
            displayName: workerData?.first_name ?? "there",
            shiftId,
            date:        win.dateYmd,
            startTime:   win.startHHmm,
            endTime:     win.endHHmm,
            startIso,
            endIso,
            hourlyRate:  rate,
            location,
        };

        const window = computeWorkerResponseWindow(
            Date.now(),
            new Date(startIso).getTime(),
        );

        const emailData = formatShiftAssignedEmailPayload({
            shifts: [insertedLike],
            clientName: " ",
            requirements,
            tasks: requestTasks,
            acceptUrl,
            declineUrl,
            window,
        });

        await enqueueNotification({
            userId:   nextUserId,
            channels: [
                {
                    channel:  "email",
                    subject:  shiftAssignedEmailSubject(1, window),
                    template: "shift-assigned",
                    data:       emailData,
                },
                {
                    channel:  "push",
                    template: "shift-assigned",
                    data: {
                        count:    1,
                        link:     `${env.APP_URL}/staff/shifts/requests/${shiftRow.request_id}`,
                        deadline: window.deadlineFormatted,
                    },
                },
            ],
        }).catch((err) =>
            logger.error("shifts.offer-worker: worker notify failed", {
                shiftId, nextUserId,
                err: err instanceof Error ? err.message : String(err),
            }),
        );

        await tasks.trigger(
            "shifts.offer-worker",
            { shiftId },
            { delay: offerWorkerDelayToTriggerDelay(window.offerWorkerDelayMs) },
        );

        logger.log("shifts.offer-worker: offered to next worker", {
            shiftId,
            nextUserId,
            newWorkerId,
            offeredCount: newOfferedIds.length,
        });
    },
});
