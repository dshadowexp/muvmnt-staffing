import { z } from "zod";
export declare const InitiatePaymentBody: z.ZodObject<{
    shiftId: z.ZodString;
    facilityId: z.ZodString;
    workerId: z.ZodString;
    amountCents: z.ZodNumber;
}, z.core.$strip>;
export declare const InitiatePaymentReply: z.ZodObject<{
    paymentId: z.ZodString;
    clientSecret: z.ZodString;
    amountCents: z.ZodNumber;
    platformFeeCents: z.ZodNumber;
    workerAmountCents: z.ZodNumber;
}, z.core.$strip>;
export declare const PaymentParams: z.ZodObject<{
    paymentId: z.ZodString;
}, z.core.$strip>;
export declare const PaymentReply: z.ZodObject<{
    id: z.ZodString;
    shiftId: z.ZodString;
    facilityId: z.ZodString;
    amountCents: z.ZodNumber;
    platformFeeCents: z.ZodNumber;
    currency: z.ZodString;
    status: z.ZodEnum<{
        failed: "failed";
        processing: "processing";
        succeeded: "succeeded";
        refunded: "refunded";
        pending: "pending";
    }>;
    stripePaymentIntentId: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const WebhookHeaders: z.ZodObject<{
    "stripe-signature": z.ZodString;
}, z.core.$strip>;
export declare const WebhookReply: z.ZodObject<{
    received: z.ZodBoolean;
}, z.core.$strip>;
export declare const OnboardWorkerBody: z.ZodObject<{
    workerId: z.ZodString;
    email: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    returnUrl: z.ZodString;
    refreshUrl: z.ZodString;
}, z.core.$strip>;
export declare const OnboardWorkerReply: z.ZodObject<{
    onboardingUrl: z.ZodString;
}, z.core.$strip>;
export declare const WorkerPayoutsParams: z.ZodObject<{
    workerId: z.ZodString;
}, z.core.$strip>;
export declare const PayoutReply: z.ZodObject<{
    id: z.ZodString;
    paymentId: z.ZodString;
    workerId: z.ZodString;
    amountCents: z.ZodNumber;
    currency: z.ZodString;
    status: z.ZodEnum<{
        failed: "failed";
        paid: "paid";
        canceled: "canceled";
        pending: "pending";
        in_transit: "in_transit";
    }>;
    stripeTransferId: z.ZodString;
    stripePayoutId: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const RetryPayoutParams: z.ZodObject<{
    payoutId: z.ZodString;
}, z.core.$strip>;
export declare const RetryPayoutReply: z.ZodObject<{
    success: z.ZodBoolean;
}, z.core.$strip>;
export type InitiatePaymentBodyType = z.infer<typeof InitiatePaymentBody>;
export type InitiatePaymentReplyType = z.infer<typeof InitiatePaymentReply>;
export type PaymentParamsType = z.infer<typeof PaymentParams>;
export type PaymentReplyType = z.infer<typeof PaymentReply>;
export type WebhookHeadersType = z.infer<typeof WebhookHeaders>;
export type OnboardWorkerBodyType = z.infer<typeof OnboardWorkerBody>;
export type OnboardWorkerReplyType = z.infer<typeof OnboardWorkerReply>;
export type WorkerPayoutsParamsType = z.infer<typeof WorkerPayoutsParams>;
export type PayoutReplyType = z.infer<typeof PayoutReply>;
export type RetryPayoutParamsType = z.infer<typeof RetryPayoutParams>;
export type RetryPayoutReplyType = z.infer<typeof RetryPayoutReply>;
