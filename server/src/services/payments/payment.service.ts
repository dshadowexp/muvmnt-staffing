import { createHash } from 'node:crypto';
import { StripeProcessor } from './processors/stripe.processor';
import { PaymentRepository, PaymentRecord } from './payment.repository';
import { PayoutService } from './payout.service';
import { PaymentStateMachine, InvalidTransitionError } from './payment.state-machine';
import { logger } from '../../config/logger';

const PLATFORM_FEE_PERCENT = 0.15

export interface InitiatePaymentParams {
    shiftId:     string
    facilityId:  string
    workerId:    string
    amountCents: number
}

export interface PaymentResult {
    paymentId:         string
    clientSecret:      string
    amountCents:       number
    platformFeeCents:  number
    workerAmountCents: number
}

export interface SetupPaymentMethodParam {
    userId: string
}

export class PaymentService {
    private readonly stripe:    StripeProcessor
    private readonly repo:      PaymentRepository
    private readonly payoutSvc: PayoutService

    constructor() {
        this.stripe    = StripeProcessor.getInstance();
        this.repo      = new PaymentRepository();
        this.payoutSvc = new PayoutService();
    }

    async setupPaymentMethod(userId: string) {
        const customerId = userId;
        const intent = await this.stripe.client.setupIntents.create({
            customer: customerId,
            payment_method_types: ['card'],
        });
        return { clientSecret: intent.client_secret };
    }

    async listPaymethods(userId: string) {
        const customerId = userId;
        const methods = await this.stripe.client.paymentMethods.list({
            customer: customerId,
        });
        return { methods };
    }


    async initiatePayment(params: InitiatePaymentParams): Promise<PaymentResult> {
        const { shiftId, facilityId, amountCents } = params
        const platformFeeCents  = Math.round(amountCents * PLATFORM_FEE_PERCENT)
        const workerAmountCents = amountCents - platformFeeCents
        const idempotencyKey    = this.deriveKey(`payment:initiate:${shiftId}`)

        const existing = await this.repo.findByShiftId(shiftId)
        if (existing) {
            const intent = await this.stripe.client.paymentIntents.retrieve(
                existing.stripe_payment_intent_id
            )
            return { paymentId: existing.id, clientSecret: intent.client_secret!, amountCents, platformFeeCents, workerAmountCents }
        }

        const intent = await this.stripe.createPaymentIntent({ amountCents, facilityId, shiftId, idempotencyKey })

        const payment = await this.repo.create({
            shiftId, facilityId, amountCents, platformFeeCents,
            stripePaymentIntentId: intent.id,
            idempotencyKey,
        })

        // Transition: (new) → pending
        await this.transition(payment.id, payment.status, 'PAYMENT_INTENT_CREATED')

        logger.info({ paymentId: payment.id, shiftId, amountCents }, 'Payment initiated')

        return { paymentId: payment.id, clientSecret: intent.client_secret!, amountCents, platformFeeCents, workerAmountCents }
    }

    // Called from webhook: payment_intent.processing
    async handlePaymentProcessing(stripePaymentIntentId: string): Promise<void> {
        const payment = await this.repo.findByPaymentIntentId(stripePaymentIntentId);
        if (!payment) return;
        await this.transition(payment.id, payment.status, 'FACILITY_CONFIRMED');
    }

    // Called from webhook: payment_intent.succeeded
    async handlePaymentSucceeded(stripePaymentIntentId: string): Promise<void> {
        const payment = await this.repo.findByPaymentIntentId(stripePaymentIntentId)
        if (!payment) return

        const nextStatus = await this.transition(payment.id, payment.status, 'STRIPE_SUCCEEDED')
        if (!nextStatus) return // already succeeded — idempotent

        const workerAmountCents = payment.amount_cents - payment.platform_fee_cents
        await this.payoutSvc.initiateWorkerPayout({
            paymentId: payment.id,
            shiftId:   payment.shift_id,
            workerAmountCents,
        })

        logger.info({ paymentId: payment.id }, 'Payment succeeded — payout triggered')
    }

    // Called from webhook: payment_intent.payment_failed
    async handlePaymentFailed(stripePaymentIntentId: string): Promise<void> {
        const payment = await this.repo.findByPaymentIntentId(stripePaymentIntentId);
        if (!payment) return;
        await this.transition(payment.id, payment.status, 'STRIPE_FAILED')
        logger.warn({ paymentId: payment.id }, 'Payment failed')
    }

    // Called from webhook: charge.refunded
    async handleRefundIssued(stripePaymentIntentId: string): Promise<void> {
        const payment = await this.repo.findByPaymentIntentId(stripePaymentIntentId)
        if (!payment) return
        await this.transition(payment.id, payment.status, 'REFUND_ISSUED')
        logger.info({ paymentId: payment.id }, 'Payment refunded')
    }

    async findById(id: string): Promise<PaymentRecord | null> {
        return this.repo.findById(id)
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    private async transition(
        paymentId: string,
        currentStatus: string,
        event: Parameters<typeof PaymentStateMachine.transition>[1]
    ): Promise<string | null> {
        try {
            const nextStatus = PaymentStateMachine.transition(
                currentStatus as Parameters<typeof PaymentStateMachine.transition>[0],
                event
            )
            await this.repo.updateStatus(paymentId, nextStatus)
            logger.info({ paymentId, from: currentStatus, event, to: nextStatus }, 'Payment state transition')
            return nextStatus
        } catch (err) {
            if (err instanceof InvalidTransitionError) {
                logger.warn({ paymentId, currentStatus, event }, 'Invalid payment transition — skipping')
                return null
            }
            throw err
        }
    }

    private deriveKey(input: string): string {
        return createHash('sha256').update(input).digest('hex')
    }
}