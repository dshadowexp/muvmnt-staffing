import { Queue, QueueEvents, QueueOptions, Worker } from "bullmq";
import { config } from "../config/env";
import { logger } from "../config/logger";

export const defualtQueueConfig: QueueOptions = {
    connection: config.redis.node,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: true,
    },
};

export abstract class BaseQueue<D, N extends string> {
    protected queue: Queue;
    protected events: QueueEvents;
    protected worker: Worker | undefined;

    constructor(
        protected readonly queueName: string,
        protected readonly concurrency: number = 10,
    ) {
        this.queue = new Queue(queueName, defualtQueueConfig);
        this.events = new QueueEvents(queueName, defualtQueueConfig);
        this.queue.setMaxListeners(0);
        this.events.setMaxListeners(0);
    }

    get q(): Queue {
        return this.queue;
    }

    abstract createWorker(): Worker<D, void, N>;

    protected workerLogger(worker: Worker<D, void, N>) {
        worker.on('completed', (job) => {
            logger.info({ jobId: job.id, idempotencyKey: job.id }, `${this.queueName} job completed`)
        });
    
        worker.on('failed', (job, err) => {
            logger.error({ jobId: job?.id, idempotencyKey: job?.id, err }, `${this.queueName} job failed`)
        });
    
        worker.on('stalled', (jobId) => {
            logger.warn({ jobId }, `${this.queueName} job stalled`)
        });
    }
}