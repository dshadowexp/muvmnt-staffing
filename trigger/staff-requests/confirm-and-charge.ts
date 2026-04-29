import { logger, metadata, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import {
    getStaffRequestById,
    markRequestConfirmed,
    estimatedCoverageTotalCents,
    type CoverageDataCache,
} from "@/features/requests/server/staff-request";
import {
    insertShiftsFromCoverage,
    type ShiftLocationPayload,
} from "@/features/requests/server/shifts";
import { createAdminClient } from "@/services/supabase/server";
import { parseShiftLocationFromStaffRequestLocation } from "@/features/requests/lib/staff-request-location-json";
import { STAFF_REQUEST_STATUS_CONFIRMED } from "@/features/requests/constants";
import type { Json } from "@/services/supabase/types/database";
import { runStaffRequestBookingSideEffects } from "@/features/shifts/server/post-shift-insert-booking";
import { getUserIdForOperator } from "@/features/account/server/operator-context";

export const confirmAndChargePayloadSchema = z.object({
    requestId: z.string().min(1),
});
export type ConfirmAndChargePayload = z.infer<typeof confirmAndChargePayloadSchema>;

export type ConfirmAndChargeProgress = {
    step:  "validating" | "charging" | "scheduling" | "notifying" | "done" | "failed";
    label: string;
    detail?: string;
};

function loadLocation(staffRequestLocation: Json): ShiftLocationPayload | null {
    return parseShiftLocationFromStaffRequestLocation(staffRequestLocation);
}

async function loadFacilityDisplayName(facilityId: string): Promise<string> {
    const supabase = await createAdminClient();
    const { data } = await supabase
        .from("facilities")
        .select("name")
        .eq("id", facilityId)
        .maybeSingle();
    return data?.name ?? "there";
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
            await metadata.set("progress", {
                step:   "done",
                label:  "Confirmed",
                detail: "Staff request already confirmed",
            } satisfies ConfirmAndChargeProgress);
            return;
        }

        const cache = row.coverage_data as CoverageDataCache | null;
        if (!cache?.schedule?.length) throw new Error("No coverage to charge for");

        // ── 2. Charge ─────────────────────────────────────────────────────────
        const amountCents = estimatedCoverageTotalCents(cache.schedule, row.pricing_rate);

        await metadata.set("progress", {
            step: "charging", label: "Charging your card",
            detail: `${(amountCents / 100).toFixed(2)} CAD`,
        } satisfies ConfirmAndChargeProgress);

        // Create invoice here
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

        const creatorUserId = await getUserIdForOperator(row.operator_id);
        if (!creatorUserId) {
            throw new Error("Staff request creator operator could not be resolved");
        }

        const [location, clientName] = await Promise.all([
            Promise.resolve(loadLocation(row.location)),
            loadFacilityDisplayName(row.facility_id),
        ]);

        const inserted = await insertShiftsFromCoverage({
            staffRequestId: payload.requestId,
            facilityId:     row.facility_id,
            hourlyRate:     row.pricing_rate,
            schedule:       cache.schedule,
            location,
        });

        if (!inserted.ok) {
            await metadata.set("progress", {
                step:   "failed",
                label:  "Scheduling failed",
                detail: inserted.message,
            } satisfies ConfirmAndChargeProgress);
            throw new Error(inserted.message);
        }

        if (inserted.inserted < 1) {
            await metadata.set("progress", {
                step:   "failed",
                label:  "No shifts created",
                detail: "Coverage produced no shift rows",
            } satisfies ConfirmAndChargeProgress);
            throw new Error("No shifts inserted from coverage");
        }

        await markRequestConfirmed(payload.requestId);

        // ── 4. Notify client + workers & schedule offer-worker passes ───────────
        await metadata.set("progress", {
            step: "notifying", label: "Sending confirmations",
        } satisfies ConfirmAndChargeProgress);

        await runStaffRequestBookingSideEffects({
            inserted,
            requestId: payload.requestId,
            creatorUserId,
            clientName,
            schedule: cache.schedule,
            hourlyRate: row.pricing_rate,
            requirements: row.requirements ?? [],
            tasks: row.tasks ?? [],
        });

        // ── 5. Done ───────────────────────────────────────────────────────────
        await metadata.set("progress", {
            step:   "done",
            label:  "Confirmed",
            detail: `${inserted.inserted} shifts created`,
        } satisfies ConfirmAndChargeProgress);

        return {
            requestId:       payload.requestId,
            paymentIntentId: "charge.paymentIntentId",
            amountCents,
            shiftsInserted:  inserted.inserted,
        };
    },
});