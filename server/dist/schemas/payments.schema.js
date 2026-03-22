"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryPayoutReply = exports.RetryPayoutParams = exports.PayoutReply = exports.WorkerPayoutsParams = exports.OnboardWorkerReply = exports.OnboardWorkerBody = exports.WebhookReply = exports.WebhookHeaders = exports.PaymentReply = exports.PaymentParams = exports.InitiatePaymentReply = exports.InitiatePaymentBody = void 0;
const zod_1 = require("zod");
// ─── Shared ───────────────────────────────────────────────────────────────────
// ─── Initiate payment ─────────────────────────────────────────────────────────
exports.InitiatePaymentBody = zod_1.z.object({
    shiftId: zod_1.z.string().uuid("Invalid shift ID"),
    facilityId: zod_1.z.string().uuid("Invalid facility ID"),
    workerId: zod_1.z.string().uuid("Invalid worker ID"),
    amountCents: zod_1.z.number().int().positive("Amount must be a positive integer"),
});
exports.InitiatePaymentReply = zod_1.z.object({
    paymentId: zod_1.z.string(),
    clientSecret: zod_1.z.string().describe("Stripe PaymentIntent client secret for frontend confirmation"),
    amountCents: zod_1.z.number().int(),
    platformFeeCents: zod_1.z.number().int(),
    workerAmountCents: zod_1.z.number().int(),
});
// ─── Get payment ──────────────────────────────────────────────────────────────
exports.PaymentParams = zod_1.z.object({
    paymentId: zod_1.z.string().uuid("Invalid payment ID"),
});
exports.PaymentReply = zod_1.z.object({
    id: zod_1.z.string(),
    shiftId: zod_1.z.string(),
    facilityId: zod_1.z.string(),
    amountCents: zod_1.z.number().int(),
    platformFeeCents: zod_1.z.number().int(),
    currency: zod_1.z.string(),
    status: zod_1.z.enum(["pending", "processing", "succeeded", "failed", "refunded"]),
    stripePaymentIntentId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// ─── Webhook ──────────────────────────────────────────────────────────────────
exports.WebhookHeaders = zod_1.z.object({
    "stripe-signature": zod_1.z.string() //({ required_error: "Missing Stripe signature header" }),
});
exports.WebhookReply = zod_1.z.object({
    received: zod_1.z.boolean(),
});
// ─── Onboard worker ───────────────────────────────────────────────────────────
exports.OnboardWorkerBody = zod_1.z.object({
    workerId: zod_1.z.string().uuid("Invalid worker ID"),
    email: zod_1.z.string().email("Invalid email"),
    firstName: zod_1.z.string().min(1, "First name is required"),
    lastName: zod_1.z.string().min(1, "Last name is required"),
    phone: zod_1.z.string().optional(),
    returnUrl: zod_1.z.string().url("Invalid return URL"),
    refreshUrl: zod_1.z.string().url("Invalid refresh URL"),
});
exports.OnboardWorkerReply = zod_1.z.object({
    onboardingUrl: zod_1.z.string().url(),
});
// ─── Worker payouts ───────────────────────────────────────────────────────────
exports.WorkerPayoutsParams = zod_1.z.object({
    workerId: zod_1.z.string().uuid("Invalid worker ID"),
});
exports.PayoutReply = zod_1.z.object({
    id: zod_1.z.string(),
    paymentId: zod_1.z.string(),
    workerId: zod_1.z.string(),
    amountCents: zod_1.z.number().int(),
    currency: zod_1.z.string(),
    status: zod_1.z.enum(["pending", "in_transit", "paid", "failed", "canceled"]),
    stripeTransferId: zod_1.z.string(),
    stripePayoutId: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// ─── Retry payout ─────────────────────────────────────────────────────────────
exports.RetryPayoutParams = zod_1.z.object({
    payoutId: zod_1.z.string().uuid("Invalid payout ID"),
});
exports.RetryPayoutReply = zod_1.z.object({
    success: zod_1.z.boolean(),
});
//# sourceMappingURL=payments.schema.js.map