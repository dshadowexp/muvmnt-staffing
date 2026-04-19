import { logger, task } from "@trigger.dev/sdk/v3";
import Stripe from "stripe";
import { z } from "zod";

import { recordCheckoutPayment } from "@/features/requests/server/charge";
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
import { getStripeServer } from "@/services/stripe/server";

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

        const location = await loadLocation(row.client_id);
        const inserted = await insertShiftsFromCoverage({
            staffRequestId: payload.requestId,
            clientUserId: row.client_id,
            hourlyRate: row.pricing_rate,
            schedule: cache.schedule,
            location,
        });

        if (!inserted.ok) {
            logger.warn("Shift insertion failed after checkout", {
                requestId: payload.requestId,
                message: inserted.message,
            });
        }

        await markRequestConfirmed(payload.requestId);

        return {
            requestId: payload.requestId,
            paymentIntentId: intent.id,
            shiftsInserted: inserted.ok ? inserted.inserted : 0,
        };
    },
});
