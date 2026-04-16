import { Worker } from 'bullmq'
import { FastifyInstance } from 'fastify'
import { logger } from '../config/logger';
import { getSendNotificationsQueue } from './send-notifications.queue';
import { getStripeWebhooksQueue } from './stripe-webhooks.queue';
import { getShiftsCycleQueue } from './shift-cycle.queue';

export async function startWorkers(app: FastifyInstance): Promise<void> {
    const workers: Worker[] = [
        getSendNotificationsQueue().createWorker(),
        getStripeWebhooksQueue().createWorker(),
        getShiftsCycleQueue().createWorker(),
    ]

    // Graceful shutdown — drain and close all workers before process exits
    app.addHook('onClose', async () => {
        logger.info(`Closing ${workers.length} BullMQ worker(s)...`);
        await Promise.all(workers.map((w) => w.close()));
        logger.info('All BullMQ workers closed');
    });

    logger.info(
        { workers: workers.map((w) => w.name) },
        `${workers.length} BullMQ worker(s) started`
    );
}
