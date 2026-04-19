import "server-only";

import { randomUUID } from "node:crypto";
import { logger } from "@trigger.dev/sdk/v3";

import { getStripeServer } from "@/services/stripe/server";
import { enqueueNotification } from "@/features/notifications/service/enqueue";

import {
    SHIFT_STATUS_COMPLETED,
    normalizeShiftStatus,
} from "../constants";
import {
    getExistingTransferIdForShift,
    getLatestSucceededPaymentForRequest,
    getShiftForPayout,
    getWorkerPayoutAccount,
    getWorkerProfileForPayout,
} from "../dal/queries";
import { insertShiftTransfer } from "../dal/mutations";

const DEFAULT_PAYOUT_CURRENCY = "cad";

/**
 * Move funds to the worker's Connect account once a shift is `completed`.
 *
 *  - Idempotent on `shift_id` via the DB unique constraint on `transfers`.
 *  - Billable hours are derived from the *scheduled* `start_time` / `end_time`
 *    (not check-in/out) so payouts are predictable for both sides.
 *  - When we can resolve the source charge from the original `payments` row we
 *    pass it as `source_transaction` so Stripe drains funds straight from the
 *    held client charge instead of platform balance.
 */
export async function processShiftPayoutJob(shiftId: string): Promise<void> {
    const row = await getShiftForPayout(shiftId);
    if (!row) {
        logger.warn("shift.payout: shift not found", { shiftId });
        return;
    }
    if (normalizeShiftStatus(row.status) !== SHIFT_STATUS_COMPLETED) {
        logger.log("shift.payout: shift not completed, skipping", {
            shiftId,
            status: row.status,
        });
        return;
    }

    const existingTransferId = await getExistingTransferIdForShift(shiftId);
    if (existingTransferId) {
        logger.log("shift.payout: transfer already recorded, skipping", {
            shiftId,
        });
        return;
    }

    if (!row.start_time || !row.end_time) {
        logger.warn("shift.payout: missing scheduled start/end times", {
            shiftId,
        });
        return;
    }
    const startMs = new Date(row.start_time).getTime();
    const endMs = new Date(row.end_time).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
        logger.warn("shift.payout: invalid scheduled time range", { shiftId });
        return;
    }

    const hours = (endMs - startMs) / (1000 * 60 * 60);
    const hourly = row.hourly_rate ?? 0;
    if (hours <= 0 || hourly <= 0) {
        logger.warn("shift.payout: zero hours or rate", {
            shiftId,
            hours,
            hourly,
        });
        return;
    }

    const amountCents = Math.max(1, Math.round(hours * hourly * 100));

    const worker = await getWorkerProfileForPayout(row.worker_id);
    if (!worker) {
        logger.error("shift.payout: worker user not found", { shiftId });
        return;
    }

    const payout = await getWorkerPayoutAccount(worker.userId);
    if (!payout) {
        logger.error("shift.payout: no payroll Connect account", { shiftId });
        return;
    }

    const stripe = getStripeServer();
    const payment = await getLatestSucceededPaymentForRequest(row.request_id);

    let sourceChargeId: string | undefined;
    let sourceChargeCurrency: string | undefined;
    if (payment?.stripePaymentId) {
        try {
            const pi = await stripe.paymentIntents.retrieve(payment.stripePaymentId);
            const charge =
                typeof pi.latest_charge === "string"
                    ? pi.latest_charge
                    : pi.latest_charge?.id;
            if (charge) {
                sourceChargeId = charge;
                sourceChargeCurrency = pi.currency;
                logger.log("shift.payout: resolved source charge", {
                    shiftId,
                    sourceChargeId,
                });
            }
        } catch (err) {
            logger.warn(
                "shift.payout: could not resolve source charge, proceeding without",
                { shiftId, err: err instanceof Error ? err.message : String(err) },
            );
        }
    } else {
        logger.warn("shift.payout: no payment found for request", {
            shiftId,
            requestId: row.request_id,
        });
    }

    const currency = sourceChargeCurrency ?? DEFAULT_PAYOUT_CURRENCY;

    let stripeTransferId: string;
    try {
        const transfer = await stripe.transfers.create({
            amount: amountCents,
            currency,
            destination: payout.stripeAccountId,
            transfer_group: row.request_id,
            ...(sourceChargeId ? { source_transaction: sourceChargeId } : {}),
            metadata: { shift_id: shiftId, worker_id: row.worker_id },
        });
        stripeTransferId = transfer.id;
    } catch (err) {
        logger.error("shift.payout: Stripe transfer failed", {
            shiftId,
            err: err instanceof Error ? err.message : String(err),
        });
        throw err instanceof Error ? err : new Error("Stripe transfer failed");
    }

    const inserted = await insertShiftTransfer({
        id: randomUUID(),
        shiftId,
        amountCents,
        currency,
        stripeTransferId,
    });
    if (!inserted.ok) {
        logger.error(
            "shift.payout: DB insert failed after Stripe transfer — reconcile manually",
            { shiftId, stripeTransferId, message: inserted.message },
        );
        throw new Error(inserted.message);
    }

    logger.log("shift.payout: transfer created", {
        shiftId,
        amountCents,
        stripeTransferId,
        payoutsEnabled: payout.payoutsEnabled,
    });

    await sendShiftPayoutReceivedEmail({
        shiftId,
        workerUserId: worker.userId,
        workerFirstName: (worker.firstName ?? "").trim(),
        amountCents,
        currency: currency.toUpperCase(),
        billableHours: hours,
        stripeTransferId,
    });
}

async function sendShiftPayoutReceivedEmail(params: {
    shiftId: string;
    workerUserId: string;
    workerFirstName: string;
    amountCents: number;
    currency: string;
    billableHours: number;
    stripeTransferId: string;
}): Promise<void> {
    const baseWeb = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    const privacyUrl = `${baseWeb}/privacy`;
    const unsubscribeUrl = `${baseWeb}/settings`;
    const shiftsUrl = `${baseWeb}/worker/shifts`;

    const currencyCode = params.currency.trim().toUpperCase() || "CAD";
    const amountLine = new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: currencyCode,
    }).format(params.amountCents / 100);

    const hoursLine = `${new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
    }).format(params.billableHours)} hrs`;

    try {
        await enqueueNotification({
            idempotencyKey: `shift-payout-email-${params.shiftId}`,
            userId: params.workerUserId,
            channels: ["email"],
            subject: "Shift payment sent",
            template: "shift-payout-received",
            data: {
                previewText: "Shift payment sent",
                workerFirstName: params.workerFirstName.trim() || "there",
                amountLine,
                hoursLine,
                referenceLine: params.stripeTransferId,
                shiftsUrl,
                privacyUrl,
                unsubscribeUrl,
            },
        });
    } catch (e) {
        logger.error("shift-payout-email: enqueue failed", {
            shiftId: params.shiftId,
            userId: params.workerUserId,
            err: e instanceof Error ? e.message : String(e),
        });
    }
}
