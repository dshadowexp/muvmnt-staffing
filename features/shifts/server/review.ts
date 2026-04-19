import "server-only";

import Stripe from "stripe";

import { getStripeServer } from "@/services/stripe/server";

import { SHIFT_STATUS_COMPLETED } from "../constants";
import {
    getClientBillingForTip,
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
    clientUserId: string,
    shiftId: string,
    input: { rating: number; comment?: string },
): Promise<ShiftReviewResult> {
    const ctx = await loadCompletedShiftForClient(
        clientUserId,
        shiftId,
        SHIFT_STATUS_COMPLETED,
    );
    if (!ctx.ok) return ctx;

    return upsertShiftRating({
        shiftId: ctx.ctx.shiftId,
        clientUserId,
        workerId: ctx.ctx.workerId,
        rating: input.rating,
        comment: input.comment?.length ? input.comment : null,
    });
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
    clientUserId: string,
    shiftId: string,
    input: { amountCents: number },
): Promise<TipChargeResult> {
    const ctx = await loadCompletedShiftForClient(
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

    const billing = await getClientBillingForTip(clientUserId);
    if (!billing) {
        return { ok: false, message: "No billing account on file" };
    }
    if (!billing.defaultPaymentMethodId) {
        return {
            ok: false,
            code: "no_payment_method",
            message: "No saved payment method — add a card first",
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

    // Re-validate the saved card is still attached to avoid a confusing
    // off-session decline downstream.
    let pm: Stripe.PaymentMethod;
    try {
        pm = await stripe.customers.retrievePaymentMethod(
            billing.stripeCustomerId,
            billing.defaultPaymentMethodId,
        );
    } catch (err) {
        if (
            err instanceof Stripe.errors.StripeInvalidRequestError &&
            err.code === "resource_missing"
        ) {
            return {
                ok: false,
                code: "no_payment_method",
                message: "Saved card is no longer available",
            };
        }
        return { ok: false, message: "Could not load saved payment method" };
    }
    if (pm.type !== "card") {
        return {
            ok: false,
            code: "unsupported_payment_method",
            message: "Only card payment methods can be used for tips",
        };
    }

    let intent: Stripe.PaymentIntent;
    try {
        intent = await stripe.paymentIntents.create(
            {
                amount: input.amountCents,
                currency: "cad",
                customer: billing.stripeCustomerId,
                payment_method: billing.defaultPaymentMethodId,
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
