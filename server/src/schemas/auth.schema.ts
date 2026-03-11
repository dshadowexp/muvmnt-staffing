import { z } from "zod";

// ─── Schemas ───────────────────────────────────────────────────────────────

// Request Body
export const ExchangeAuthTokenBody = z.object({
  token: z
    .string()
    .min(1, "Third-party or short-lived token to exchange"),
  role: z
    .string()
});

// Success Response
export const ExchangeAuthTokenReply = z.object({
  token: z.string(),
})

// Error Response
export const ErrorReply = z.object({
  statusCode: z.number(),
  error: z.string(),
  message: z.string(),
})

// ─── Types ──────────────────────────────────────────────────────────────────

export type ExchangeAuthTokenBodyType =
  z.infer<typeof ExchangeAuthTokenBody>

export type ExchangeAuthTokenReplyType =
  z.infer<typeof ExchangeAuthTokenReply>