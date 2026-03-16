import { z } from 'zod'

// ─── Create account ───────────────────────────────────────────────────────────

export const CreateAccountReply = z.object({
  customerId:             z.string(),
  defaultPaymentMethodId: z.string().nullable(),
})

// ─── Setup intent ─────────────────────────────────────────────────────────────

export const SetupIntentReply = z.object({
  clientSecret: z.string(),
  customerId:   z.string(),
})

// ─── Card ─────────────────────────────────────────────────────────────────────

const CardReply = z.object({
  paymentMethodId: z.string(),
  brand:           z.string(),
  last4:           z.string(),
  expMonth:        z.number().int(),
  expYear:         z.number().int(),
  isDefault:       z.boolean(),
})

export const ListCardsReply = z.array(CardReply)

// ─── Payment method params ────────────────────────────────────────────────────

export const PaymentMethodParams = z.object({
  paymentMethodId: z.string().min(1),
})

export const RemoveCardReply = z.object({
  success: z.boolean(),
})

export const SetDefaultReply = z.object({
  success: z.boolean(),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentMethodParamsType = z.infer<typeof PaymentMethodParams>