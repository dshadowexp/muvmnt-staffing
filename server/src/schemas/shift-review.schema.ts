import { z } from 'zod';

/** Rate a completed shift (1–5 stars + optional comment). */
export const RateShiftBody = z.object({
  rating:  z.number().int().min(1).max(5),
  comment: z.string().trim().max(1_000).optional(),
});
export type RateShiftBodyType = z.infer<typeof RateShiftBody>;

/** Tip a completed shift. `amountCents` is the full tip amount in the worker’s currency. */
export const TipShiftBody = z.object({
  amountCents: z.number().int().min(100).max(100_000),
});
export type TipShiftBodyType = z.infer<typeof TipShiftBody>;

export const TipShiftReply = z.object({
  ok:               z.literal(true),
  paymentIntentId:  z.string(),
  amountCents:      z.number().int(),
  currency:         z.string(),
});
export type TipShiftReplyType = z.infer<typeof TipShiftReply>;
