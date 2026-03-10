import { Job, Worker } from 'bullmq'
import { BaseQueue } from './base.queue'
import { PaymentService } from '../services/payments/payment.service'
import { logger } from '../config/logger'
import { PayoutService } from '../services/payments/payout.service'

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
    private readonly paymentService: PaymentService;
    private readonly payoutService: PayoutService;

    constructor() {
        super('payments');
        this.paymentService = new PaymentService();
        this.payoutService = new PayoutService();
    }

    createWorker() {
        const worker = new Worker<PaymentJobData, void, PaymentJobName>(
            this.queueName,
            async (job: Job<PaymentJobData, void, PaymentJobName>) => {
                logger.info({ jobId: job.id, jobName: job.name }, 'Processing payment job');

                switch (job.name) {
                    // ─── Payment events ───────────────────────────────────────────────
                    case 'payment.processing': {
                        const { stripePaymentIntentId } = job.data as ProcessPaymentJobData;
                        await this.paymentService.handlePaymentProcessing(stripePaymentIntentId);
                        break
                    }
            
                    case 'payment.succeeded': {
                        const { stripePaymentIntentId } = job.data as ProcessPaymentJobData;
                        await this.paymentService.handlePaymentSucceeded(stripePaymentIntentId);
                        break;
                    }
            
                    case 'payment.failed': {
                        const { stripePaymentIntentId } = job.data as ProcessPaymentJobData
                        await this.paymentService.handlePaymentFailed(stripePaymentIntentId)
                        break;
                    }
            
                    case 'payment.refunded': {
                        const { stripePaymentIntentId } = job.data as ProcessPaymentJobData
                        await this.paymentService.handleRefundIssued(stripePaymentIntentId)
                        break;
                    }
            
                    // ─── Payout events ────────────────────────────────────────────────
            
                    case 'payout.initiate': {
                        const { paymentId, shiftId, workerAmountCents } = job.data as InitiatePayoutJobData
                        await this.payoutService.initiateWorkerPayout({ paymentId, shiftId, workerAmountCents })
                        break;
                    }
            
                    case 'payout.paid': {
                        const { stripePayoutId } = job.data as ProcessPayoutJobData
                        await this.payoutService.handlePayoutPaid(stripePayoutId)
                        break;
                    }
            
                    case 'payout.failed': {
                        const { stripePayoutId } = job.data as ProcessPayoutJobData
                        await this.payoutService.handlePayoutFailed(stripePayoutId)
                        break;
                    }
            
                    case 'payout.canceled': {
                        const { stripePayoutId } = job.data as ProcessPayoutJobData;
                        await this.payoutService.handlePayoutCanceled(stripePayoutId);
                        break;
                    }
            
                    case 'payout.retry': {
                        const { payoutId } = job.data as RetryPayoutJobData;
                        await this.payoutService.retryPayout(payoutId);
                        break;
                    }
            
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