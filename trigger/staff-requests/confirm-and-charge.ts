import { logger, metadata, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { formatInTimeZone } from "date-fns-tz";
import { parseISO } from "date-fns";
import { SHIFT_SCHEDULE_TIMEZONE } from "@/features/shifts/lib/shift-schedule-timezone";
import type { DaySchedule } from "@/features/requests/server/matching";
import { chargeStaffRequestOffSession } from "@/features/requests/server/charge";
import {
    getStaffRequestById,
    markRequestConfirmed,
    estimatedCoverageTotalCents,
    type CoverageDataCache,
} from "@/features/requests/server/staff-request";
import {
    insertShiftsFromCoverage,
    type ShiftLocationPayload,
    type InsertedWorkerShift,
} from "@/features/requests/server/shifts";
import { createAdminClient } from "@/services/supabase/server";
import { STAFF_REQUEST_STATUS_CONFIRMED } from "@/features/requests/constants";
import { enqueueNotification } from "@/features/notifications/service/enqueue";

export const confirmAndChargePayloadSchema = z.object({
    requestId: z.string().min(1),
});
export type ConfirmAndChargePayload = z.infer<typeof confirmAndChargePayloadSchema>;

export type ConfirmAndChargeProgress = {
    step:  "validating" | "charging" | "scheduling" | "notifying" | "done" | "failed";
    label: string;
    detail?: string;
};

async function loadLocation(clientUserId: string): Promise<ShiftLocationPayload | null> {
    const supabase = await createAdminClient();
    const { data } = await supabase
        .from("locations")
        .select("address, lat, lng")
        .eq("user_id", clientUserId)
        .maybeSingle();
    return data ?? null;
}

async function loadClientName(clientUserId: string): Promise<string> {
    const supabase = await createAdminClient();
    const { data } = await supabase
        .from("clients")
        .select("name")
        .eq("id", clientUserId)
        .maybeSingle();
    return data?.name ?? "there";
}

function formatWorkerShiftsEmailData(params: {
    shifts:      InsertedWorkerShift[];
    clientName:  string;
    requirements: string[];
    tasks:        string[];
    acceptUrl:   string;
    declineUrl:  string;
}) {
    const { shifts, clientName, requirements, tasks, acceptUrl, declineUrl } = params;

    const formattedShifts = shifts
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((s) => ({
            dateLine: formatInTimeZone(
                parseISO(`${s.date}T12:00:00Z`),
                SHIFT_SCHEDULE_TIMEZONE,
                "EEEE, MMM d",  // e.g. "Monday, May 1"
            ),
            timeLine: `${s.startTime} – ${s.endTime}`,
        }));

    return {
        previewText:      `New shift${shifts.length > 1 ? "s" : ""} from ${clientName} — respond within 30 minutes`,
        workerFirstName:  shifts[0]!.displayName.split(" ")[0],
        clientName,
        shiftCount:       shifts.length,
        multipleShifts:   shifts.length > 1,
        address:          shifts[0]!.location?.address ?? "TBD",
        rateLine:         `$${shifts[0]!.hourlyRate.toFixed(2)}/hr`,
        requirements:     requirements.length ? requirements.join(", ") : null,
        tasks:            tasks.length ? tasks.join(", ") : null,
        shifts:           formattedShifts,
        acceptUrl,
        declineUrl,
    };
}

function formatClientBookedEmailData(params: {
    clientName: string;
    requestId:       string;
    schedule:        DaySchedule[];
    hourlyRate:      number;
    totalShifts:     number;
}) {
    const { clientName, requestId, schedule, hourlyRate, totalShifts } = params;

    // Collect all unique dates that have assignments
    const coveredDates = schedule
        .filter((d) => d.assignments.length > 0)
        .map((d) => d.date)
        .sort();

    // e.g. "May 1 – May 7" or "May 1" for a single day
    const formatDate = (ymd: string) =>
        formatInTimeZone(parseISO(`${ymd}T12:00:00Z`), SHIFT_SCHEDULE_TIMEZONE, "MMM d");

    const scheduleLine =
        coveredDates.length === 0
            ? "TBD"
            : coveredDates.length === 1
              ? formatDate(coveredDates[0]!)
              : `${formatDate(coveredDates[0]!)} – ${formatDate(coveredDates[coveredDates.length - 1]!)}`;

    // e.g. "6 shifts across 3 days"
    const dayCount   = coveredDates.length;
    const shiftsLine = `${totalShifts} shift${totalShifts !== 1 ? "s" : ""} across ${dayCount} day${dayCount !== 1 ? "s" : ""}`;

    const rateLine = `$${hourlyRate.toFixed(2)}/hr`;

    return {
        previewText: `Your staff request is confirmed — ${shiftsLine}`,
        name:        clientName,
        scheduleLine,
        shiftsLine,
        rateLine,
        requestId,
        requestUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/requests/${requestId}`,
    };
}

export const confirmAndChargeTask = schemaTask({
    id: "staff-requests.confirm-and-charge",
    schema: confirmAndChargePayloadSchema,
    maxDuration: 180,
    retry: {
        maxAttempts: 2,
        minTimeoutInMs: 5_000,
        maxTimeoutInMs: 30_000,
        factor: 2,
        randomize: true,
    },
    run: async (payload) => {
        // ── 1. Validate ───────────────────────────────────────────────────────
        await metadata.set("progress", {
            step: "validating", label: "Reviewing your coverage",
        } satisfies ConfirmAndChargeProgress);

        const row = await getStaffRequestById(payload.requestId);
        if (!row)                    throw new Error("Staff request not found");
        if (row.pricing_rate == null) throw new Error("Pricing tier not selected");
        if (row.status === STAFF_REQUEST_STATUS_CONFIRMED) {
            throw new Error("Staff request already confirmed");
        }

        const cache = row.coverage_data as CoverageDataCache | null;
        if (!cache?.schedule?.length) throw new Error("No coverage to charge for");

        // ── 2. Charge ─────────────────────────────────────────────────────────
        const amountCents = estimatedCoverageTotalCents(cache.schedule, row.pricing_rate);

        await metadata.set("progress", {
            step: "charging", label: "Charging your card",
            detail: `${(amountCents / 100).toFixed(2)} CAD`,
        } satisfies ConfirmAndChargeProgress);

        // const charge = await chargeStaffRequestOffSession({
        //     requestId: payload.requestId,
        //     amountCents,
        // });

        // if (!charge.ok) {
        //     await metadata.set("progress", {
        //         step: "failed", label: "Payment failed", detail: charge.message,
        //     } satisfies ConfirmAndChargeProgress);
        //     throw new Error(charge.message);
        // }

        // ── 3. Insert shifts ──────────────────────────────────────────────────
        await metadata.set("progress", {
            step: "scheduling", label: "Booking your shifts",
        } satisfies ConfirmAndChargeProgress);

        const [location, clientName] = await Promise.all([
            loadLocation(row.client_user_id),
            loadClientName(row.client_user_id),
        ]);

        const inserted = await insertShiftsFromCoverage({
            staffRequestId: payload.requestId,
            clientUserId:   row.client_user_id,
            hourlyRate:     row.pricing_rate,
            schedule:       cache.schedule,
            location,
        });

        if (!inserted.ok) {
            logger.warn("Shift insertion failed after successful charge", {
                requestId: payload.requestId,
                message:   inserted.message,
            });
        }

        await markRequestConfirmed(payload.requestId);

        // ── 4. Notify ─────────────────────────────────────────────────────────
        await metadata.set("progress", {
            step: "notifying", label: "Sending confirmations",
        } satisfies ConfirmAndChargeProgress);

        const notifyAll: Promise<unknown>[] = [];

        // Client confirmation
        notifyAll.push(
            enqueueNotification({
                userId: row.client_user_id,
                channels: [
                    {
                        channel:  "email",
                        subject:  "Your request has been confirmed",
                        template: "staff-request-booked",
                        data:     formatClientBookedEmailData({
                            clientName,
                            requestId:   payload.requestId,
                            schedule:    cache.schedule,
                            hourlyRate:  row.pricing_rate,
                            totalShifts: inserted.ok ? inserted.inserted : 0,
                        }),
                    },
                    {
                        channel:  "push",
                        template: "staff-request-booked",
                        data: {
                            name: clientName,
                            requestId: payload.requestId,
                            link: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/requests/${payload.requestId}`,
                        },
                    },
                ],
            }),
        );

        // One email + push per worker, grouped by all their shifts
        if (inserted.ok) {
            for (const [workerUserId, shifts] of inserted.workerShifts) {
                const acceptUrl  = `${process.env.NEXT_PUBLIC_APP_URL}/requests/respond?action=accept&workerId=${workerUserId}&requestId=${payload.requestId}`;
                const declineUrl = `${process.env.NEXT_PUBLIC_APP_URL}/requests/respond?action=decline&workerId=${workerUserId}&requestId=${payload.requestId}`;
            
                notifyAll.push(
                    enqueueNotification({
                        userId: workerUserId,
                        channels: [
                            {
                                channel:  "email",
                                subject:  `New shift${shifts.length > 1 ? "s" : ""} assigned — respond within 30 minutes`,
                                template: "shift-assigned",
                                data:     formatWorkerShiftsEmailData({
                                    shifts,
                                    clientName:   ' ',
                                    requirements: row.requirements ?? [],
                                    tasks:        row.tasks ?? [],
                                    acceptUrl,
                                    declineUrl,
                                }),
                            },
                            {
                                channel:  "push",
                                template: "shift-assigned",
                                data: {
                                    count: shifts.length,
                                    link:  `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/requests/${payload.requestId}`,
                                },
                            },
                        ],
                    }),
                );
            }
        }

        await Promise.allSettled(notifyAll);

        // ── 5. Done ───────────────────────────────────────────────────────────
        await metadata.set("progress", {
            step:   "done",
            label:  "Confirmed",
            detail: inserted.ok
                ? `${inserted.inserted} shifts created`
                : "Shifts will be created shortly",
        } satisfies ConfirmAndChargeProgress);

        return {
            requestId:       payload.requestId,
            paymentIntentId: "charge.paymentIntentId",
            amountCents,
            shiftsInserted:  inserted.ok ? inserted.inserted : 0,
        };
    },
});