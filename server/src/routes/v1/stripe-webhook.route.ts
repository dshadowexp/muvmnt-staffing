import { FastifyInstance } from 'fastify';
import { stripe } from '../../config/stripe';
import { config } from '../../config/env';
import { logger } from '../../config/logger';
import { getStripeWebhooksQueue } from '../../background/stripe-webhooks.queue';

export default async function stripeWebhookRoutes(app: FastifyInstance): Promise<void> {
    app.post(
        '/webhook',
        {
            config: {
                rawBody: true,
                rateLimit: false,
            },
        },
        async (request, reply) => {
            const sigHeader = request.headers['stripe-signature'];
            const signature = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader;

            if (!signature) {
                return reply.code(400).send({ error: 'Missing stripe-signature header' });
            }

            const rawBody = request.rawBody;
            if (rawBody === undefined) {
                logger.error('Stripe webhook received without rawBody — check fastify-raw-body route config');
                return reply.code(500).send({ error: 'Webhook misconfigured' });
            }

            try {
                const event = stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
                await getStripeWebhooksQueue().enqueueVerifiedEvent(event);
                return reply.code(202).send({ received: true });
            } catch (err) {
                logger.warn({ err }, 'Stripe webhook signature verification failed');
                return reply.code(400).send({ error: 'Invalid signature' });
            }
        },
    );
}
