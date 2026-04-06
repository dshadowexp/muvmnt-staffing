import { Job, Worker } from 'bullmq';
import type Stripe from 'stripe';
import { BaseQueue } from './base.queue';
import { config } from '../config/env';
import { logger } from '../config/logger';
import type { StripeWebhookJobDataType } from '../schemas/stripe-webhook.schema';
import { syncPayrollAccountFromStripeAccount } from '../services/stripe/payroll-accounts.repository';

export type StripeWebhookJobName = string;

export class StripeWebhooksQueue extends BaseQueue<StripeWebhookJobDataType, StripeWebhookJobName> {
    constructor() {
        super('stripe-webhooks', 5);
    }

    createWorker() {
        const worker = new Worker<StripeWebhookJobDataType, void, StripeWebhookJobName>(
            this.queueName,
            async (job: Job<StripeWebhookJobDataType, void, StripeWebhookJobName>) => {
                await this.dispatch(job.data);
            },
            {
                connection: config.redis.node,
                concurrency: this.concurrency,
            },
        );

        this.workerLogger(worker);
        return worker;
    }

    async enqueueVerifiedEvent(event: Stripe.Event): Promise<void> {
        const jobData: StripeWebhookJobDataType = {
            eventId: event.id,
            type: event.type,
            livemode: event.livemode,
            data: event.data,
        };

        const existingJob = await this.queue.getJob(event.id);
        if (existingJob) {
            const state = await existingJob.getState();
            if (state === 'completed' || state === 'failed') {
                logger.info({ eventId: event.id, type: event.type }, 'Stripe webhook skipped — already enqueued')
                return;
            }
            logger.info({ eventId: event.id, type: event.type }, 'Stripe webhook skipped — already enqueued')
            return;
        }

        await this.queue.add(event.type, jobData, {
            jobId: event.id,
        });

        logger.info({ eventId: event.id, type: event.type }, 'Stripe webhook enqueued');
    }

    private async dispatch(payload: StripeWebhookJobDataType): Promise<void> {
        switch (payload.type) {
            case 'account.updated': {
                await syncPayrollAccountFromStripeAccount(payload.data.object);
                return;
            }
            case "checkout.session.completed": {
                // const session = event.data.object as Stripe.Checkout.Session
                // const userId = session.metadata?.userId
                // const priceId = session.metadata?.priceId

                // if (userId && priceId) {
                // const { data: userBillingAccount } = await supabase.from("billing_accounts").select("*").eq("user_id", userId).single();

                // if (userBillingAccount) {
                // await supabase.from("billing_accounts").update({
                //     stripe_current_period_end: new Date().toISOString(),
                //     stripe_price_id: priceId,
                //     }).eq("id", userBillingAccount.id);
                // }
                // }
                // break
                return;
            }
            case "customer.subscription.updated": {
                // const subscription = event.data.object as Stripe.Subscription
                // const customerId = subscription.customer as string
        
                // const { data: userBillingAccount } = await supabase.from("billing_accounts").select("*").eq("stripe_customer_id", customerId).single();
        
                // if (userBillingAccount) {
                //   await supabase.from("billing_accounts").update({
                //     stripe_current_period_end: new Date().toISOString(),
                //   }).eq("id", userBillingAccount.id);
                // }
                // break;
                return;
            }
            case "customer.subscription.deleted": {
                // const subscription = event.data.object as Stripe.Subscription
                // const customerId = subscription.customer as string;
                // const { data: userBillingAccount } = await supabase.from("billing_accounts").select("*").eq("stripe_customer_id", customerId).single();
                // if (userBillingAccount) {
                // await supabase.from("billing_accounts").update({
                //     stripe_current_period_end: null,
                // }).eq("stripe_customer_id", customerId);
                // }
                return;
            }
            default:
                logger.debug({ type: payload.type, eventId: payload.eventId }, 'Stripe webhook type not handled');
        }
    }
}

const stripeWebhooksBackground = new StripeWebhooksQueue();

export function getStripeWebhooksQueue() {
    return stripeWebhooksBackground;
}
