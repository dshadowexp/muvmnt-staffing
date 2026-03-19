import { Job, Worker } from 'bullmq'
import { BaseQueue } from './base.queue'
import { logger } from '../config/logger'

// ─── Job data ─────────────────────────────────────────────────────────────────

export interface ProcessPaymentJobData {
    idempotencyKey:          string
    stripePaymentIntentId:   string
    event:                   'processing' | 'succeeded' | 'failed' | 'refunded'
}

export interface ProcessPayoutJobData {
    idempotencyKey:   string
    stripePayoutId:   string
    event:            'paid' | 'failed' | 'canceled'
}

export interface InitiatePayoutJobData {
    idempotencyKey:    string
    paymentId:         string
    shiftId:           string
    workerAmountCents: number
}

export interface RetryPayoutJobData {
    idempotencyKey: string
    payoutId:       string
}

export type PaymentJobData =
    | ProcessPaymentJobData
    | ProcessPayoutJobData
    | InitiatePayoutJobData
    | RetryPayoutJobData

export type PaymentJobName =
    | 'payment.processing'
    | 'payment.succeeded'
    | 'payment.failed'
    | 'payment.refunded'
    | 'payout.initiate'
    | 'payout.paid'
    | 'payout.failed'
    | 'payout.canceled'
    | 'payout.retry'
    | (string & {});

export interface ProcessPaymentsEventParam {
    eventName:  PaymentJobName,
    id:         string
}

// ─── Queue ────────────────────────────────────────────────────────────────────

export class PaymentsQueue extends BaseQueue<PaymentJobData, PaymentJobName> {
    constructor() {
        super('payments');
    }

    createWorker() {
        const worker = new Worker<PaymentJobData, void, PaymentJobName>(
            this.queueName,
            async (job: Job<PaymentJobData, void, PaymentJobName>) => {
                logger.info({ jobId: job.id, jobName: job.name }, 'Processing payment job');

                switch (job.name) {
                    // ─── Payment events ───────────────────────────────────────────────
            
            
                    default:
                      logger.warn({ jobName: job.name }, 'Unknown payment job name — skipping')
                }
            },
            {
                connection:  this.queue.opts.connection,
                concurrency: 5,           // lower than notifications — Stripe calls are heavier
            }
        );
            
        this.workerLogger(worker);
    
        return worker
    }

    async enqueue(params: ProcessPaymentsEventParam): Promise<{ idempotencyKey: string }> {
        const { eventName, id } = params;

        return { idempotencyKey: ' ' };
    }
}


const paymentsBackground = new PaymentsQueue();

export function getPaymentsQueue() {
    return paymentsBackground;
}