import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PaymentService } from '../../services/payments/payment.service';
import { PayoutService } from '../../services/payments/payout.service';
import {
  InitiatePaymentBody,
  InitiatePaymentBodyType,
  PaymentParams,
  PaymentParamsType,
  OnboardWorkerBody,
  OnboardWorkerBodyType,
  WorkerPayoutsParams,
  WorkerPayoutsParamsType,
  RetryPayoutParams,
  RetryPayoutParamsType,
} from '../../schemas/payments.schema';
import { StripeProcessor } from '../../services/payments/processors/stripe.processor';
import { getPaymentsQueue } from '../../background/payments.queue';

export default async function paymentRoutes(app: FastifyInstance): Promise<void> {
    const paymentService = new PaymentService();
    const payoutService  = new PayoutService();
    const paymentsQueue = getPaymentsQueue();

    // ─── POST /payments/initiate ──────────────────────────────────────────────
    app.get(
        '/stripe-oauth-url',
        {
            onRequest: [app.authenticate],
            schema: {
                summary:  'Initiate shift payment',
                tags:     ['Payments'],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request, reply) => {
            const user = { country: '', id: '', email: '' }
            const state = Buffer.from(user.id).toString('base64');

            const queryParams = new URLSearchParams({
                response_type: 'code',
                client_id: process.env.NEXT_PUBLIC_STRIPE_OAUTH_CLIENT_ID ?? '',
                scope: 'read_write',
                redirect_uri: `${process.env.NEXT_PUBLIC_API_URL}/api/oauth/stripe`,
                "stripe_user[email]": user.email,
                ...(user.country && { "stripe_user[country]": user.country }),
                state
            });

            return reply.code(200).send({ url: `https://connect.stripe.com/oauth/authorize?${queryParams.toString()}` });
        }
    )

    app.delete(
        '/method',
        {
            onRequest: [app.authenticate],
            schema: {
                summary:  'Remove payment method',
                tags:     ['Payments'],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request, reply) => {
            const userId = request.user.sub;
            const body   = { customerId: '' };

            return reply.code(200).send({});
        }
    )

    

    // ─── POST /payments/initiate ──────────────────────────────────────────────

    

    app.post<{ Body: InitiatePaymentBodyType }>(
        '/initiate',
        {
            onRequest: [app.authenticate],
            schema: {
                summary:  'Initiate shift payment',
                tags:     ['Payments'],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request, reply) => {
            const body   = InitiatePaymentBody.parse(request.body)
            const result = await paymentService.initiatePayment(body)
            return reply.code(200).send(result)
        }
    )

    // ─── GET /payments/:paymentId ─────────────────────────────────────────────

    app.get<{ Params: PaymentParamsType }>(
        '/:paymentId',
        {
            onRequest: [app.authenticate],
            schema: {
                summary:  'Get payment by ID',
                tags:     ['Payments'],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request, reply) => {
            const { paymentId } = PaymentParams.parse(request.params)
            const payment = await paymentService.findById(paymentId)

            if (!payment) {
                return reply.code(404).send({ statusCode: 404, error: 'Not Found', message: 'Payment not found' })
            }

            return reply.code(200).send({
                id:                    payment.id,
                shiftId:               payment.shift_id,
                facilityId:            payment.facility_id,
                amountCents:           payment.amount_cents,
                platformFeeCents:      payment.platform_fee_cents,
                currency:              payment.currency,
                status:                payment.status,
                stripePaymentIntentId: payment.stripe_payment_intent_id,
                createdAt:             payment.created_at,
                updatedAt:             payment.updated_at,
            });
        }
    )

    // ─── POST /payments/webhook ───────────────────────────────────────────────
    // No auth — Stripe hits this directly. Signature verification is the guard.

    app.post(
        '/webhook',
        {
            config: { rawBody: true },
            schema: {
                summary: 'Stripe webhook receiver',
                tags:    ['Payments'],
                hide:    true,
            },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const sig     = request.headers['stripe-signature'] as string;
            const payload = (request as any).rawBody as Buffer;

            let event

            try {
                event = StripeProcessor.getInstance().constructWebhookEvent(
                    payload,
                    sig
                );
            } catch {
                return reply.code(400).send({ statusCode: 400, error: 'Bad Request', message: 'Invalid Stripe signature' })
            }

            const obj      = event.data.object as any
            const intentId = obj.id as string

            // Webhook handler enqueues jobs immediately and returns 200 to Stripe.
            // All heavy processing happens in the payment worker asynchronously.
            switch (event.type) {
                case 'payment_intent.processing':
                    await paymentsQueue.enqueue({ eventName: 'payment.processing', id: intentId });
                    break
                case 'payment_intent.succeeded':
                    await paymentsQueue.enqueue({ eventName: 'payment.succeeded', id: intentId });
                    break
                case 'payment_intent.payment_failed':
                    await paymentsQueue.enqueue({ eventName: 'payment.failed', id: intentId });
                    break
                case 'charge.refunded':
                    await paymentsQueue.enqueue({ eventName: 'payment.refunded', id: obj.payment_intent });
                    break
                case 'payout.paid':
                    await paymentsQueue.enqueue({ eventName: 'payout.paid', id: obj.payment_intent });
                    break
                case 'payout.failed':
                    await paymentsQueue.enqueue({ eventName: 'payout.failed', id: obj.payment_intent });
                    break
                case 'payout.canceled':
                    await paymentsQueue.enqueue({ eventName: 'payout.canceled', id: obj.payment_intent });
                    break
                default:
                app.log.info({ eventType: event.type }, 'Unhandled Stripe webhook event')
            }

            return reply.code(200).send({ received: true })
        }
    )

    // ─── POST /payments/onboard-worker ───────────────────────────────────────

    app.post<{ Body: OnboardWorkerBodyType }>(
        '/onboard-worker',
        {
            onRequest: [app.authenticate],
            schema: {
                summary:  'Onboard worker onto Stripe Connect',
                tags:     ['Payments'],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request, reply) => {
            const body   = OnboardWorkerBody.parse(request.body);
            const result = await payoutService.onboardWorker(body);
            return reply.code(200).send(result);
        }
    )

    // ─── GET /payments/payouts/worker/:workerId ───────────────────────────────

    app.get<{ Params: WorkerPayoutsParamsType }>(
        '/payouts/worker/:workerId',
        {
            onRequest: [app.authenticate],
            schema: {
                summary:  'List payouts for a worker',
                tags:     ['Payments'],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request, reply) => {
            const { workerId } = WorkerPayoutsParams.parse(request.params)
            const payouts      = await payoutService.findByWorkerId(workerId)

            return reply.code(200).send(
                payouts.map((p) => ({
                    id:               p.id,
                    paymentId:        p.payment_id,
                    workerId:         p.worker_id,
                    amountCents:      p.amount_cents,
                    currency:         p.currency,
                    status:           p.status,
                    stripeTransferId: p.stripe_transfer_id,
                    stripePayoutId:   p.stripe_payout_id,
                    createdAt:        p.created_at,
                    updatedAt:        p.updated_at,
                }))
            );
        }
    )

    // ─── POST /payments/payouts/:payoutId/retry ───────────────────────────────

    app.post<{ Params: RetryPayoutParamsType }>(
        '/payouts/:payoutId/retry',
        {
            onRequest: [app.authenticate, app.requireRole('admin')],
            schema: {
                summary:  'Retry a failed payout',
                tags:     ['Payments'],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request, reply) => {
            const { payoutId } = RetryPayoutParams.parse(request.params);
            await payoutService.retryPayout(payoutId);
            return reply.code(200).send({ success: true });
        }
    )
}