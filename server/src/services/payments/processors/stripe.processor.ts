import Stripe from 'stripe';
import { config } from '../../../config/env';

export class StripeProcessor {
    private static instance: StripeProcessor;
    readonly client: Stripe

    private constructor() {
        this.client = new Stripe(config.stripe.secretKey, {
            apiVersion: '2026-02-25.clover',
            typescript:  true,
        })
    }

    static getInstance(): StripeProcessor {
        if (!StripeProcessor.instance) {
            StripeProcessor.instance = new StripeProcessor();
        }
        return StripeProcessor.instance
    }

    // ─── Connect accounts (for healthcare workers) ────────────────────────────

    async createConnectAccount(params: {
        email:     string
        firstName: string
        lastName:  string
        phone?:    string
    }): Promise<Stripe.Account> {
        return this.client.accounts.create({
            type:  'express',
            email:  params.email,
            capabilities: {
                transfers: { requested: true },
            },
            business_type: 'individual',
            individual: {
                email:      params.email,
                first_name: params.firstName,
                last_name:  params.lastName,
                phone:      params.phone,
            },
            settings: {
                payouts: {
                    schedule: { interval: 'manual' }, // agency controls payout timing
                },
            },
        });
    }

    async createAccountOnboardingLink(params: {
        accountId:  string
        refreshUrl: string
        returnUrl:  string
    }): Promise<string> {
        const link = await this.client.accountLinks.create({
            account:     params.accountId,
            refresh_url: params.refreshUrl,
            return_url:  params.returnUrl,
            type:        'account_onboarding',
        });
        return link.url;
    }

    async getAccount(accountId: string): Promise<Stripe.Account> {
        return this.client.accounts.retrieve(accountId)
    }

    // ─── Payment intents (facility paying agency) ─────────────────────────────

    async createPaymentIntent(params: {
        amountCents:      number
        currency?:        string
        facilityId:       string   // metadata — Supabase facility ID
        shiftId:          string   // metadata — shift being paid for
        idempotencyKey:   string
    }): Promise<Stripe.PaymentIntent> {
        return this.client.paymentIntents.create(
            {
                amount:   params.amountCents,
                currency: params.currency ?? config.stripe.currency,
                metadata: {
                    facilityId: params.facilityId,
                    shiftId:    params.shiftId,
                },
                automatic_payment_methods: { enabled: true },
            },
            { idempotencyKey: params.idempotencyKey }
        )
    }

    async confirmPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
        return this.client.paymentIntents.confirm(paymentIntentId)
    }

    // ─── Transfers (agency to worker after platform fee) ──────────────────────

    async createTransfer(params: {
        amountCents:      number
        destinationAccountId: string  // worker's Stripe Connect account ID
        shiftId:          string
        workerId:         string
        idempotencyKey:   string
    }): Promise<Stripe.Transfer> {
        return this.client.transfers.create(
            {
                amount:      params.amountCents,
                currency:    config.stripe.currency,
                destination: params.destinationAccountId,
                metadata: {
                shiftId:  params.shiftId,
                workerId: params.workerId,
                },
            },
            { idempotencyKey: params.idempotencyKey }
        )
    }

    // ─── Payouts (worker's Stripe balance → bank) ─────────────────────────────

    async createPayout(params: {
        amountCents:      number
        connectedAccountId: string
        workerId:         string
        idempotencyKey:   string
    }): Promise<Stripe.Payout> {
        return this.client.payouts.create(
            {
                amount:   params.amountCents,
                currency: config.stripe.currency,
                metadata: { workerId: params.workerId },
            },
            {
                idempotencyKey:     params.idempotencyKey,
                stripeAccount:      params.connectedAccountId, // act on behalf of worker
            }
        );
    }

    // ─── Webhooks ─────────────────────────────────────────────────────────────

    constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
        return this.client.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);
    }
}