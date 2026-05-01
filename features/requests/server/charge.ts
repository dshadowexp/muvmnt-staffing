import "server-only";

import Stripe from "stripe";
import { getStripeServer } from "@/services/stripe/server";
import { createAdminClient } from "@/supabase/server";
import { getBillingAccount } from "@/features/billing/dal/payment-methods";

/** Minimal card snapshot persisted on `payments.payment_method` (jsonb). */
export type StaffRequestPaymentMethodCardSnapshot = {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
};

export type StaffRequestChargeResult =
    | { ok: true; paymentIntentId: string; amountCents: number }
    | { ok: false; message: string; code?: string };

function mapStripeChargeError(err: unknown): { message: string; code?: string } {
    if (err instanceof Stripe.errors.StripeCardError) {
        const decline =
            "decline_code" in err && typeof err.decline_code === "string"
                ? err.decline_code
                : undefined;
        switch (err.code) {
            case "card_declined":
                return {
                    message:
                        decline === "insufficient_funds"
                            ? "Your card has insufficient funds."
                            : "Your card was declined. Try another payment method.",
                    code: decline ?? err.code,
                };
            case "expired_card":
                return { message: "Your card has expired.", code: err.code };
            case "incorrect_cvc":
            case "incorrect_number":
                return {
                    message: "Your card details could not be verified.",
                    code: err.code,
                };
            case "processing_error":
                return { message: "A processing error occurred; try again.", code: err.code };
            case "authentication_required":
                return {
                    message:
                        "This card requires authentication. Add the card again while you are signed in.",
                    code: err.code,
                };
            default:
                return { message: err.message ?? "Card payment failed.", code: err.code };
        }
    }
    if (err instanceof Stripe.errors.StripeInvalidRequestError) {
        return { message: err.message ?? "Invalid payment request.", code: err.code };
    }
    if (err instanceof Stripe.errors.StripeError) {
        return { message: err.message ?? "Payment failed.", code: err.code };
    }
    return { message: "Payment failed." };
}

async function insertStaffRequestPayment(row: {
    requestId: string;
    stripePaymentIntentId: string;
    amountCents: number;
    currency: string;
    status: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("payments").insert({
        request_id: row.requestId,
        stripe_payment_id: row.stripePaymentIntentId,
        amount_cents: row.amountCents,
        currency: row.currency,
        status: row.status,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
}

/** Off-session PaymentIntent. Idempotency key prevents double-charge on retry. */
export async function chargeStaffRequestOffSession(params: {
    requestId: string;
    amountCents: number;
}): Promise<StaffRequestChargeResult> {
    if (!Number.isFinite(params.amountCents) || params.amountCents < 50) {
        return {
            ok: false,
            message: "Invalid or too small amount to charge.",
            code: "invalid_amount",
        };
    }

    const billing = await getBillingAccount();
    const account = "data" in billing ? billing.data : null;

    if (!account) return {
        ok: false,
        message: "No billing account found. Add a card and try again.",
        code: "no_billing_account",
    };

    const stripe = getStripeServer();

    try {
        const intent = await stripe.paymentIntents.create(
            {
                amount: params.amountCents,
                currency: "cad",
                customer: account.customerId,
                confirm: true,
                off_session: true,
                transfer_group: params.requestId,
                metadata: {
                    staff_request_id: params.requestId,
                },
            },
            { idempotencyKey: `staff-request-confirm-${params.requestId}` },
        );

        if (intent.status !== "succeeded") {
            return { ok: false, message: "Payment did not complete.", code: intent.status };
        }

        const saved = await insertStaffRequestPayment({
            requestId: params.requestId,
            stripePaymentIntentId: intent.id,
            amountCents: params.amountCents,
            currency: "cad",
            status: "succeeded",
        });
        if (!saved.ok) {
            return { ok: false, message: saved.message, code: "payment_row_failed" };
        }

        return {
            ok: true,
            paymentIntentId: intent.id,
            amountCents: params.amountCents,
        };
    } catch (err) {
        const { message, code } = mapStripeChargeError(err);
        return { ok: false, message, code };
    }
}

export async function recordCheckoutPayment(params: {
    requestId: string;
    paymentIntentId: string;
    paymentMethodId: string;
    stripeCustomerId: string;
    amountCents: number;
    currency: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
    const stripe = getStripeServer();
    let pm: Stripe.PaymentMethod;
    try {
        pm = await stripe.customers.retrievePaymentMethod(
            params.stripeCustomerId,
            params.paymentMethodId,
        );
    } catch (err) {
        return {
            ok: false,
            message:
                err instanceof Error
                    ? err.message
                    : "Could not load checkout session payment method.",
        };
    }

    return insertStaffRequestPayment({
        requestId: params.requestId,
        stripePaymentIntentId: params.paymentIntentId,
        amountCents: params.amountCents,
        currency: params.currency,
        status: "succeeded",
    });
}
