import { logger } from '../../config/logger'
import { BillingRepository } from './billing.repository'
import { StripeProcessor } from './processors/stripe.processor'

export interface CardSummary {
  id:              string
  brand:           string
  last4:           string
  expMonth:        number
  expYear:         number
  isDefault:       boolean
}

export interface BillingAccount {
  customerId:             string
  defaultPaymentMethodId: string | null
}

export class BillingService {
  private readonly repo: BillingRepository

  constructor() {
    this.repo = new BillingRepository();
  }

  // ─── Get billing account row ─────────────────────────
  async getAccount(params: {userId: string}): Promise<BillingAccount | null> {
    const existing = await this.repo.findByUserId(params.userId);

    if (existing) {
        return {
            customerId:             existing.stripe_customer_id,
            defaultPaymentMethodId: existing.default_payment_method_id,
        }
    }

    return null;
  }


  // ─── Create Stripe customer + billing account row ─────────────────────────

  async createAccount(params: {
    userId: string
  }): Promise<BillingAccount> {
    const existing = await this.repo.findByUserId(params.userId);
    if (existing) {
        return {
            customerId:             existing.stripe_customer_id,
            defaultPaymentMethodId: existing.default_payment_method_id,
        }
    }

    const customer = await StripeProcessor.getInstance().client.customers.create({
        metadata: {
            userId: params.userId
        }
    })

    await this.repo.create(params.userId, customer.id)

    logger.info({ userId: params.userId, customerId: customer.id }, 'Billing account created')

    return { customerId: customer.id, defaultPaymentMethodId: null }
  }

  // ─── Create setup intent — client uses clientSecret to collect card ────────

  async createSetupIntent(userId: string): Promise<{ clientSecret: string }> {
    const billing = await this.getOrThrow(userId)

    const intent = await StripeProcessor.getInstance().client.setupIntents.create({
        customer: billing.stripe_customer_id,
        payment_method_types: ['card'],
        automatic_payment_methods: {
          enabled: false,
        },
    });

    if (!intent.client_secret) throw new Error('Stripe did not return a client secret');

    logger.info({ userId, customerId: billing.stripe_customer_id }, 'Setup intent created');

    return { clientSecret: intent.client_secret };
  }

  // ─── List saved cards ─────────────────────────────────────────────────────

  async listCards(userId: string): Promise<CardSummary[]> {
    const billing = await this.getOrThrow(userId)

    const methods = await StripeProcessor.getInstance().client.paymentMethods.list({ 
        customer: billing.stripe_customer_id 
    });

    return methods.data.map((pm): CardSummary => ({
        id:              pm.id,
        brand:           pm.card!.brand,
        last4:           pm.card!.last4,
        expMonth:        pm.card!.exp_month,
        expYear:         pm.card!.exp_year,
        isDefault:       pm.id === billing.default_payment_method_id,
    }))
  }

  // ─── Remove a card ────────────────────────────────────────────────────────

  async removeCard(userId: string, paymentMethodId: string): Promise<void> {
    const billing = await this.getOrThrow(userId)

    // Confirm this card belongs to this customer before detaching
    const methods = await StripeProcessor.getInstance().client.paymentMethods.list({ 
        customer: billing.stripe_customer_id 
    });
    const owned   = methods.data.some((pm) => pm.id === paymentMethodId);

    if (!owned) throw new Error('Payment method not found on this account')

    await StripeProcessor.getInstance().client.paymentMethods.detach(paymentMethodId)

    // Clear default if the removed card was the default
    if (billing.default_payment_method_id === paymentMethodId) {
      await this.repo.updateDefaultPaymentMethod(userId, null);
    }

    logger.info({ userId, paymentMethodId }, 'Card removed')
  }

    // ─── Set default card ─────────────────────────────────────────────────────

    async setDefaultCard(userId: string, paymentMethodId: string): Promise<void> {
        const billing = await this.getOrThrow(userId);
        const methods = await StripeProcessor.getInstance().client.paymentMethods.list({ 
            customer: billing.stripe_customer_id 
        });
        const owned   = methods.data.some((pm) => pm.id === paymentMethodId);

        if (!owned) throw new Error('Payment method not found on this account');

        await this.repo.updateDefaultPaymentMethod(userId, paymentMethodId);
        logger.info({ userId, paymentMethodId }, 'Default card updated')
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    private async getOrThrow(userId: string) {
        const billing = await this.repo.findByUserId(userId)
        if (!billing) throw new Error(`No billing account found for user ${userId} — call createAccount first`)
        return billing
    }
}