"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsQueue = void 0;
exports.getPaymentsQueue = getPaymentsQueue;
const bullmq_1 = require("bullmq");
const base_queue_1 = require("./base.queue");
const logger_1 = require("../config/logger");
// ─── Queue ────────────────────────────────────────────────────────────────────
class PaymentsQueue extends base_queue_1.BaseQueue {
    constructor() {
        super('payments');
    }
    createWorker() {
        const worker = new bullmq_1.Worker(this.queueName, async (job) => {
            logger_1.logger.info({ jobId: job.id, jobName: job.name }, 'Processing payment job');
            switch (job.name) {
                // ─── Payment events ───────────────────────────────────────────────
                default:
                    logger_1.logger.warn({ jobName: job.name }, 'Unknown payment job name — skipping');
            }
        }, {
            connection: this.queue.opts.connection,
            concurrency: 5, // lower than notifications — Stripe calls are heavier
        });
        this.workerLogger(worker);
        return worker;
    }
    async enqueue(params) {
        const { eventName, id } = params;
        return { idempotencyKey: ' ' };
    }
}
exports.PaymentsQueue = PaymentsQueue;
const paymentsBackground = new PaymentsQueue();
function getPaymentsQueue() {
    return paymentsBackground;
}
//# sourceMappingURL=billing.queue.js.map