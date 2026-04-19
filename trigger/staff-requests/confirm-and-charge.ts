import { logger, metadata, task } from "@trigger.dev/sdk/v3";
import { z } from "zod";

import {
    chargeStaffRequestOffSession,
} from "@/features/requests/server/charge";
import {
    getStaffRequestById,
    markRequestConfirmed,
    type CoverageDataCache,
} from "@/features/requests/server/staff-request";
import {
    insertShiftsFromCoverage,
    type ShiftLocationPayload,
} from "@/features/requests/server/shifts";
import { createAdminClient } from "@/services/supabase/server";
import { estimatedCoverageTotalCents } from "@/features/requests/server/staff-request";

export const confirmAndChargePayloadSchema = z.object({
    requestId: z.string().min(1),
    stripeCustomerId: z.string().min(1),
    paymentMethodId: z.string().min(1),
});
export type ConfirmAndChargePayload = z.infer<typeof confirmAndChargePayloadSchema>;

export type ConfirmAndChargeProgress = {
    step:
        | "queued"
        | "validating"
        | "charging"
        | "scheduling"
        | "done"
        | "failed";
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
    if (!data) return null;
    return { address: data.address, lat: data.lat, lng: data.lng };
}

export const confirmAndChargeTask = task({
    id: "staff-requests.confirm-and-charge",
    maxDuration: 180,
    retry: {
        maxAttempts: 2,
        minTimeoutInMs: 5_000,
        maxTimeoutInMs: 30_000,
        factor: 2,
        randomize: true,
    },
    run: async (raw: ConfirmAndChargePayload) => {
        const payload = confirmAndChargePayloadSchema.parse(raw);

        await metadata.set("progress", {
            step: "validating",
            label: "Reviewing your coverage",
        } satisfies ConfirmAndChargeProgress);

        const row = await getStaffRequestById(payload.requestId);
        if (!row) throw new Error("Staff request not found");
        if (row.pricing_rate == null) {
            throw new Error("Pricing tier not selected");
        }

        const cache = row.coverage_data as CoverageDataCache | null;
        if (!cache?.schedule?.length) {
            throw new Error("No coverage to charge for");
        }

        const amountCents = estimatedCoverageTotalCents(
            cache.schedule,
            row.pricing_rate,
        );

        await metadata.set("progress", {
            step: "charging",
            label: "Charging your card",
            detail: `${(amountCents / 100).toFixed(2)} CAD`,
        } satisfies ConfirmAndChargeProgress);

        const charge = await chargeStaffRequestOffSession({
            requestId: payload.requestId,
            clientUserId: row.client_id,
            stripeCustomerId: payload.stripeCustomerId,
            paymentMethodId: payload.paymentMethodId,
            amountCents,
        });

        if (!charge.ok) {
            await metadata.set("progress", {
                step: "failed",
                label: "Payment failed",
                detail: charge.message,
            } satisfies ConfirmAndChargeProgress);
            throw new Error(charge.message);
        }

        await metadata.set("progress", {
            step: "scheduling",
            label: "Booking your shifts",
        } satisfies ConfirmAndChargeProgress);

        const location = await loadLocation(row.client_id);
        const inserted = await insertShiftsFromCoverage({
            staffRequestId: payload.requestId,
            clientUserId: row.client_id,
            hourlyRate: row.pricing_rate,
            schedule: cache.schedule,
            location,
        });

        if (!inserted.ok) {
            logger.warn("Shift insertion failed after successful charge", {
                requestId: payload.requestId,
                message: inserted.message,
            });
        }

        await markRequestConfirmed(payload.requestId);

        await metadata.set("progress", {
            step: "done",
            label: "Confirmed",
            detail: inserted.ok
                ? `${inserted.inserted} shifts created`
                : "Shifts will be created shortly",
        } satisfies ConfirmAndChargeProgress);

        return {
            requestId: payload.requestId,
            paymentIntentId: charge.paymentIntentId,
            amountCents,
            shiftsInserted: inserted.ok ? inserted.inserted : 0,
        };
    },
});
