import { z } from "zod";

// ─── Schemas ───────────────────────────────────────────────────────────────
// Error Response
export const ErrorReply = z.object({
    statusCode: z.number(),
    error: z.string(),
    message: z.string(),
});

// ─── Types ──────────────────────────────────────────────────────────────────

export type ErrorReplyType              = z.infer<typeof ErrorReply>