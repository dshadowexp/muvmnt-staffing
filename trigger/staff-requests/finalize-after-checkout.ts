import { logger, task } from "@trigger.dev/sdk/v3";
import Stripe from "stripe";
import { z } from "zod";

import { recordCheckoutPayment } from "@/features/requests/server/charge";
import {
    getStaffRequestById,
    markRequestConfirmed,
    type CoverageDataCache,
} from "@/features/requests/server/staff-request";
import { runStaffRequestBookingSideEffects } from "@/features/shifts/server/post-shift-insert-booking";
import {
    insertShiftsFromCoverage,
    type ShiftLocationPayload,
} from "@/features/requests/server/shifts";
import { createAdminClient } from "@/services/supabase/server";
import { getStripeServer } from "@/services/stripe/server";
import { getUserIdForOperator } from "@/features/account/server/operator-context";

export const finalizeAfterCheckoutPayloadSchema = z.object({
    requestId: z.string().min(1),
    sessionId: z.string().min(1),
});
export type FinalizeAfterCheckoutPayload = z.infer<
    typeof finalizeAfterCheckoutPayloadSchema
>;

async function loadLocation(
    clientUserId: string,
): Promise<ShiftLocationPayload | null> {
    const supabase = await createAdminClient();
    const { data } = await supabase
        .from("locations")
        .select("address, lat, lng")
        .eq("user_id", clientUserId)
        .maybeSingle();
    if (!data) return null;
    return { address: data.address, lat: data.lat, lng: data.lng };
}

async function expandSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return getStripeServer().checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent", "payment_intent.payment_method"],
    });
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

/**
 * Runs after a successful Stripe Checkout for a staff-request payment. The
 * webhook handler enqueues this task with `idempotencyKey: <session_id>` so
 * Stripe's at-least-once delivery does not produce duplicate shifts.
 */
export const finalizeAfterCheckoutTask = task({
    id: "staff-requests.finalize-after-checkout",
    maxDuration: 180,
    retry: {
        maxAttempts: 5,
        minTimeoutInMs: 5_000,
        maxTimeoutInMs: 60_000,
        factor: 2,
        randomize: true,
    },
    run: async (raw: FinalizeAfterCheckoutPayload) => {
        const payload = finalizeAfterCheckoutPayloadSchema.parse(raw);
        logger.log("Finalizing staff request after checkout", payload);

        const row = await getStaffRequestById(payload.requestId);
        if (!row) throw new Error("Staff request not found");
        if (row.pricing_rate == null) {
            throw new Error("Pricing tier not selected");
        }

        const cache = row.coverage_data as CoverageDataCache | null;
        if (!cache?.schedule?.length) {
            throw new Error("No coverage data on file for this request");
        }

        const session = await expandSession(payload.sessionId);
        if (session.payment_status !== "paid") {
            throw new Error(`Checkout session not paid (${session.payment_status})`);
        }
        const intent = session.payment_intent;
        if (!intent || typeof intent === "string") {
            throw new Error("Checkout session missing expanded payment_intent");
        }
        const paymentMethod = intent.payment_method;
        const paymentMethodId =
            typeof paymentMethod === "string"
                ? paymentMethod
                : paymentMethod?.id ?? null;
        const customerId =
            typeof session.customer === "string"
                ? session.customer
                : session.customer?.id ?? null;
        if (!customerId || !paymentMethodId) {
            throw new Error("Checkout session missing customer or payment method");
        }

        await recordCheckoutPayment({
            requestId: payload.requestId,
            paymentIntentId: intent.id,
            paymentMethodId,
            stripeCustomerId: customerId,
            amountCents: intent.amount_received ?? intent.amount,
            currency: intent.currency ?? "cad",
        });

        const creatorUserId = await getUserIdForOperator(row.operator_id);
        const location =
            creatorUserId != null ? await loadLocation(creatorUserId) : null;
        const inserted = await insertShiftsFromCoverage({
            staffRequestId: payload.requestId,
            facilityId: row.facility_id,
            hourlyRate: row.pricing_rate,
            schedule: cache.schedule,
            location,
        });

        if (!inserted.ok) {
            logger.error("Shift insertion failed after checkout", {
                requestId: payload.requestId,
                message: inserted.message,
            });
            throw new Error(inserted.message);
        }

        if (inserted.inserted < 1) {
            throw new Error("No shifts inserted from coverage after checkout");
        }

        if (!creatorUserId) {
            throw new Error("Staff request creator operator could not be resolved");
        }

        const clientName = await loadFacilityDisplayName(row.facility_id);

        await markRequestConfirmed(payload.requestId);

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

        return {
            requestId: payload.requestId,
            paymentIntentId: intent.id,
            shiftsInserted: inserted.inserted,
        };
    },
});
