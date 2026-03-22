import { Worker } from 'bullmq';
import { BaseQueue } from './base.queue';
export interface ProcessPaymentJobData {
    idempotencyKey: string;
    stripePaymentIntentId: string;
    event: 'processing' | 'succeeded' | 'failed' | 'refunded';
}
export interface ProcessPayoutJobData {
    idempotencyKey: string;
    stripePayoutId: string;
    event: 'paid' | 'failed' | 'canceled';
}
export interface InitiatePayoutJobData {
    idempotencyKey: string;
    paymentId: string;
    shiftId: string;
    workerAmountCents: number;
}
export interface RetryPayoutJobData {
    idempotencyKey: string;
    payoutId: string;
}
export type PaymentJobData = ProcessPaymentJobData | ProcessPayoutJobData | InitiatePayoutJobData | RetryPayoutJobData;
export type PaymentJobName = 'payment.processing' | 'payment.succeeded' | 'payment.failed' | 'payment.refunded' | 'payout.initiate' | 'payout.paid' | 'payout.failed' | 'payout.canceled' | 'payout.retry' | (string & {});
export interface ProcessPaymentsEventParam {
    eventName: PaymentJobName;
    id: string;
}
export declare class PaymentsQueue extends BaseQueue<PaymentJobData, PaymentJobName> {
    constructor();
    createWorker(): Worker<PaymentJobData, void, PaymentJobName>;
    enqueue(params: ProcessPaymentsEventParam): Promise<{
        idempotencyKey: string;
    }>;
}
export declare function getPaymentsQueue(): PaymentsQueue;
