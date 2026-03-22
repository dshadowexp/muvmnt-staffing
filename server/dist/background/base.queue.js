"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseQueue = exports.defualtQueueConfig = void 0;
const bullmq_1 = require("bullmq");
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
exports.defualtQueueConfig = {
    connection: env_1.config.redis.node,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
};
class BaseQueue {
    queueName;
    concurrency;
    queue;
    events;
    worker;
    constructor(queueName, concurrency = 10) {
        this.queueName = queueName;
        this.concurrency = concurrency;
        this.queue = new bullmq_1.Queue(queueName, exports.defualtQueueConfig);
        this.events = new bullmq_1.QueueEvents(queueName, exports.defualtQueueConfig);
        this.queue.setMaxListeners(0);
        this.events.setMaxListeners(0);
    }
    get q() {
        return this.queue;
    }
    workerLogger(worker) {
        worker.on('completed', (job) => {
            logger_1.logger.info({ jobId: job.id, idempotencyKey: job.id }, 'Notification job completed');
        });
        worker.on('failed', (job, err) => {
            logger_1.logger.error({ jobId: job?.id, idempotencyKey: job?.id, err }, 'Notification job failed');
        });
        worker.on('stalled', (jobId) => {
            logger_1.logger.warn({ jobId }, 'Notification job stalled');
        });
    }
}
exports.BaseQueue = BaseQueue;
//# sourceMappingURL=base.queue.js.map