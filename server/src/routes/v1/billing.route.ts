import { FastifyInstance, FastifyRequest } from 'fastify'

import {
  PaymentMethodParams,
  PaymentMethodParamsType,
} from '../../schemas/billing.schema'
import { BillingService } from '../../services/payments/billing.service'

export default async function billingRoutes(app: FastifyInstance): Promise<void> {
    const billingService = new BillingService();

    app.get(
        '/account',
        {
            onRequest: [app.authenticate],
            schema: {
                summary:  'Get billing account (Stripe Customer)',
                tags:     ['Billing'],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request, reply) => {
            const { sub: userId } = request.user;
            const result = await billingService.getAccount({ userId });
            return reply.code(200).send(result);
        }
    )

    // ─── POST /billing/account ────────────────────────────────────────────────
    // Creates a Stripe Customer for the authenticated user.
    // Idempotent — returns existing account if one already exists.

    app.post(
        '/account',
        {
            onRequest: [app.authenticate],
            schema: {
                summary:  'Create a billing account (Stripe Customer)',
                tags:     ['Billing'],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request, reply) => {
            const { sub: userId } = request.user;
            const result = await billingService.createAccount({ userId });
            return reply.code(201).send(result);
        }
    )

    // ─── POST /billing/setup-intent ───────────────────────────────────────────
    // Returns a clientSecret — the frontend uses it with Stripe.js to securely
    // collect and attach a card without it touching your server.
    //
    // Flow:
    //   1. Call this endpoint → get clientSecret
    //   2. Frontend: stripe.confirmCardSetup(clientSecret, { payment_method: { card } })
    //   3. Stripe attaches the card to the customer
    //   4. Call GET /billing/cards to see the new card appear

    app.post(
        '/setup-intent',
        {
            onRequest: [app.authenticate],
            schema: {
                summary:  'Create a setup intent to add a card',
                tags:     ['Billing'],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request: FastifyRequest, reply) => {
            const { sub: userId } = request.user;
            const result          = await billingService.createSetupIntent(userId);
            return reply.code(200).send(result)
        }
    )

    // ─── GET /billing/cards ───────────────────────────────────────────────────

    app.get(
        '/cards',
        {
            onRequest: [app.authenticate],
            schema: {
                summary:  'List saved cards',
                tags:     ['Billing'],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request: FastifyRequest, reply) => {
            const { sub: userId } = request.user
            const cards           = await billingService.listCards(userId)
            return reply.code(200).send(cards)
        }
    )

    // ─── DELETE /billing/cards/:paymentMethodId ───────────────────────────────

    app.delete<{ Params: PaymentMethodParamsType }>(
        '/cards/:paymentMethodId',
        {
            onRequest: [app.authenticate],
            schema: {
                summary:  'Remove a saved card',
                tags:     ['Billing'],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request, reply) => {
            const { paymentMethodId } = PaymentMethodParams.parse(request.params)
            const { sub: userId }     = request.user

            try {
                await billingService.removeCard(userId, paymentMethodId)
                return reply.code(200).send({ success: true })
            } catch (err: any) {
                return reply.code(400).send({ statusCode: 400, error: 'Bad Request', message: err.message })
            }
        }
    )

    // ─── PUT /billing/cards/:paymentMethodId/default ──────────────────────────

    app.put<{ Params: PaymentMethodParamsType }>(
        '/cards/default',
        {
            onRequest: [app.authenticate],
            schema: {
                summary:  'Set a card as the default payment method',
                tags:     ['Billing'],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request, reply) => {
            const { paymentMethodId } = PaymentMethodParams.parse(request.body)
            const { sub: userId }     = request.user

            try {
                await billingService.setDefaultCard(userId, paymentMethodId)
                return reply.code(200).send({ success: true })
            } catch (err: any) {
                return reply.code(400).send({ statusCode: 400, error: 'Bad Request', message: err.message })
            }
        }
    )
}