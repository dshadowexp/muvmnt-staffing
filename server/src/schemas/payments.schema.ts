import { z } from "zod"

// ─── Shared ───────────────────────────────────────────────────────────────────

// ─── Initiate payment ─────────────────────────────────────────────────────────

export const InitiatePaymentBody = z.object({
  shiftId:     z.string().uuid("Invalid shift ID"),
  facilityId:  z.string().uuid("Invalid facility ID"),
  workerId:    z.string().uuid("Invalid worker ID"),
  amountCents: z.number().int().positive("Amount must be a positive integer"),
})

export const InitiatePaymentReply = z.object({
  paymentId:         z.string(),
  clientSecret:      z.string().describe("Stripe PaymentIntent client secret for frontend confirmation"),
  amountCents:       z.number().int(),
  platformFeeCents:  z.number().int(),
  workerAmountCents: z.number().int(),
})

// ─── Get payment ──────────────────────────────────────────────────────────────

export const PaymentParams = z.object({
  paymentId: z.string().uuid("Invalid payment ID"),
})

export const PaymentReply = z.object({
  id:                    z.string(),
  shiftId:               z.string(),
  facilityId:            z.string(),
  amountCents:           z.number().int(),
  platformFeeCents:      z.number().int(),
  currency:              z.string(),
  status:                z.enum(["pending", "processing", "succeeded", "failed", "refunded"]),
  stripePaymentIntentId: z.string(),
  createdAt:             z.string().datetime(),
  updatedAt:             z.string().datetime(),
})

// ─── Webhook ──────────────────────────────────────────────────────────────────

export const WebhookHeaders = z.object({
    "stripe-signature": z.string()//({ required_error: "Missing Stripe signature header" }),
})

export const WebhookReply = z.object({
  received: z.boolean(),
})

// ─── Onboard worker ───────────────────────────────────────────────────────────

export const OnboardWorkerBody = z.object({
  workerId:   z.string().uuid("Invalid worker ID"),
  email:      z.string().email("Invalid email"),
  firstName:  z.string().min(1, "First name is required"),
  lastName:   z.string().min(1, "Last name is required"),
  phone:      z.string().optional(),
  returnUrl:  z.string().url("Invalid return URL"),
  refreshUrl: z.string().url("Invalid refresh URL"),
})

export const OnboardWorkerReply = z.object({
  onboardingUrl: z.string().url(),
})

// ─── Worker payouts ───────────────────────────────────────────────────────────

export const WorkerPayoutsParams = z.object({
  workerId: z.string().uuid("Invalid worker ID"),
})

export const PayoutReply = z.object({
  id:               z.string(),
  paymentId:        z.string(),
  workerId:         z.string(),
  amountCents:      z.number().int(),
  currency:         z.string(),
  status:           z.enum(["pending", "in_transit", "paid", "failed", "canceled"]),
  stripeTransferId: z.string(),
  stripePayoutId:   z.string().nullable(),
  createdAt:        z.string().datetime(),
  updatedAt:        z.string().datetime(),
})

// ─── Retry payout ─────────────────────────────────────────────────────────────

export const RetryPayoutParams = z.object({
  payoutId: z.string().uuid("Invalid payout ID"),
})

export const RetryPayoutReply = z.object({
  success: z.boolean(),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type InitiatePaymentBodyType  = z.infer<typeof InitiatePaymentBody>
export type InitiatePaymentReplyType = z.infer<typeof InitiatePaymentReply>
export type PaymentParamsType        = z.infer<typeof PaymentParams>
export type PaymentReplyType         = z.infer<typeof PaymentReply>
export type WebhookHeadersType       = z.infer<typeof WebhookHeaders>
export type OnboardWorkerBodyType    = z.infer<typeof OnboardWorkerBody>
export type OnboardWorkerReplyType   = z.infer<typeof OnboardWorkerReply>
export type WorkerPayoutsParamsType  = z.infer<typeof WorkerPayoutsParams>
export type PayoutReplyType          = z.infer<typeof PayoutReply>
export type RetryPayoutParamsType    = z.infer<typeof RetryPayoutParams>
export type RetryPayoutReplyType     = z.infer<typeof RetryPayoutReply>