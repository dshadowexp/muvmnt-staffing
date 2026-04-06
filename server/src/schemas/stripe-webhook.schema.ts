import { z } from 'zod';

/** Serializable payload enqueued after Stripe signature verification */
export const StripeWebhookJobData = z.object({
    eventId: z.string(),
    type: z.string(),
    livemode: z.boolean(),
    data: z.any(),
});

export type StripeWebhookJobDataType = z.infer<typeof StripeWebhookJobData>;
