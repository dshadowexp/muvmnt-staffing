import "server-only";

import Stripe from "stripe";
import { tasks } from "@trigger.dev/sdk/v3";

import { getStripeServer } from "@/services/stripe/server";

import { SHIFT_STATUS_COMPLETED } from "../constants";
import {
    getFacilityBillingForTip,
    getExistingTipIdForClient,
    getWorkerTipAccount,
    loadCompletedShiftForClient,
} from "../dal/queries";
import {
    insertShiftTip,
    upsertShiftRating,
} from "../dal/mutations";

export type ShiftReviewResult<T = unknown> =
    | ({ ok: true } & T)
    | { ok: false; code?: string; message: string };

export async function rateClientShift(
    facilityId: string,
    clientUserId: string,
    shiftId: string,
    input: { rating: number; comment?: string },
): Promise<ShiftReviewResult> {
    const ctx = await loadCompletedShiftForClient(
        facilityId,
        clientUserId,
        shiftId,
        SHIFT_STATUS_COMPLETED,
    );
    if (!ctx.ok) return ctx;

    const result = await upsertShiftRating({
        shiftId: ctx.ctx.shiftId,
        clientUserId,
        workerId: ctx.ctx.workerId,
        rating: input.rating,
        comment: input.comment?.length ? input.comment : null,
    });

    if (result.ok) {
        // Recompute rating_avg + rating_count on the worker row asynchronously.
        // Idempotency key collapses rapid re-rates (e.g. client edits within
        // seconds) into a single sync so the worker row is never over-written
        // by racing tasks.
        void tasks
            .trigger(
                "shifts.sync-worker-rating",
                { workerId: ctx.ctx.workerId },
                { idempotencyKey: `sync-worker-rating:${ctx.ctx.workerId}` },
            )
            .catch(() => {
                // Non-fatal — the rating write already succeeded. The worker
                // aggregate will self-correct on the next rating event.
            });
    }

    return result;
}

export type TipChargeResult = ShiftReviewResult<{
    paymentIntentId: string;
    amountCents: number;
    currency: string;
}>;

/**
 * Charge the client's saved card and route funds straight to the worker's
 * Connect account using `transfer_data.destination`. Platform takes no fee on
 * tips. Idempotent on `(shift, client)` via Stripe idempotency key + DB unique
 * constraint on `shift_tips`.
 */
export async function tipClientShift(
    facilityId: string,
    clientUserId: string,
    shiftId: string,
    input: { amountCents: number },
): Promise<TipChargeResult> {
    const ctx = await loadCompletedShiftForClient(
        facilityId,
        clientUserId,
        shiftId,
        SHIFT_STATUS_COMPLETED,
    );
    if (!ctx.ok) return ctx;

    const existingTipId = await getExistingTipIdForClient(
        ctx.ctx.shiftId,
        clientUserId,
    );
    if (existingTipId) {
        return {
            ok: false,
            code: "already_tipped",
            message: "You have already tipped this shift",
        };
    }

    const billing = await getFacilityBillingForTip(ctx.ctx.facilityId);
    if (!billing) {
        return { ok: false, message: "No billing account on file" };
    }
    if (!billing.stripeCustomerId) {
        return {
            ok: false,
            code: "no_stripe_customer_id",
            message: "No Stripe customer ID — add a card first",
        };
    }

    const payout = await getWorkerTipAccount(ctx.ctx.workerUserId);
    if (!payout) {
        return {
            ok: false,
            code: "worker_not_payable",
            message: "Worker cannot receive payouts yet",
        };
    }
    if (payout.chargesEnabled === false) {
        return {
            ok: false,
            code: "worker_not_payable",
            message: "Worker’s payout account is not active",
        };
    }

    const stripe = getStripeServer();

    let intent: Stripe.PaymentIntent;
    try {
        intent = await stripe.paymentIntents.create(
            {
                amount: input.amountCents,
                currency: "cad",
                customer: billing.stripeCustomerId,
                confirm: true,
                off_session: true,
                transfer_data: { destination: payout.stripeAccountId },
                metadata: {
                    kind: "shift_tip",
                    shift_id: ctx.ctx.shiftId,
                    worker_id: ctx.ctx.workerId,
                    worker_user_id: ctx.ctx.workerUserId,
                    client_user_id: clientUserId,
                },
            },
            { idempotencyKey: `shift-tip-${ctx.ctx.shiftId}-${clientUserId}` },
        );
    } catch (err) {
        if (err instanceof Stripe.errors.StripeCardError) {
            return {
                ok: false,
                code: err.code,
                message: err.message ?? "Card was declined",
            };
        }
        if (err instanceof Stripe.errors.StripeError) {
            return {
                ok: false,
                code: err.code,
                message: err.message ?? "Payment failed",
            };
        }
        return { ok: false, message: "Payment failed" };
    }

    if (intent.status !== "succeeded") {
        return {
            ok: false,
            code: intent.status,
            message: "Tip did not complete",
        };
    }

    const currency = (intent.currency ?? "cad").toUpperCase();
    const inserted = await insertShiftTip({
        shiftId: ctx.ctx.shiftId,
        clientUserId,
        workerId: ctx.ctx.workerId,
        amountCents: input.amountCents,
        currency,
        stripePaymentIntentId: intent.id,
        stripeDestinationAccountId: payout.stripeAccountId,
    });
    if (!inserted.ok) return inserted;

    return {
        ok: true,
        paymentIntentId: intent.id,
        amountCents: input.amountCents,
        currency,
    };
}
