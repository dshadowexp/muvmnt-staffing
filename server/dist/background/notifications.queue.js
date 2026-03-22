"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsQueue = void 0;
exports.getNotificationsQueue = getNotificationsQueue;
exports.createNotificationsWorker = createNotificationsWorker;
const node_crypto_1 = require("node:crypto");
const bullmq_1 = require("bullmq");
const base_queue_1 = require("./base.queue");
const notifications_service_1 = require("../services/notifications/notifications.service");
const logger_1 = require("../config/logger");
const env_1 = require("../config/env");
const notifications_repository_1 = require("../services/notifications/notifications.repository");
class NotificationsQueue extends base_queue_1.BaseQueue {
    service;
    repo;
    constructor() {
        super('notifications');
        this.service = new notifications_service_1.NotificationService();
        this.repo = new notifications_repository_1.NotificationRepository();
    }
    createWorker() {
        const worker = new bullmq_1.Worker(this.queueName, async (job) => {
            const { idempotencyKey, userId, channels, subject, template, data } = job.data;
            logger_1.logger.info({ jobId: job.id, idempotencyKey, userId, template }, 'Processing notification job');
            await this.service.send({ idempotencyKey, userId, channels, subject, template, data });
        }, {
            connection: env_1.config.redis.node,
            concurrency: this.concurrency,
        });
        this.workerLogger(worker);
        return worker;
    }
    // ─── Enqueue (non-blocking, called from routes) ───────────────────────────
    async enqueue(params) {
        const { userId, subject, template, data, delay } = params;
        const channels = Array.isArray(params.channels) ? params.channels : [params.channels];
        // Derive a stable key from the intent if caller didn't supply one.
        // Same user + template + data always produces the same key — safe to retry.
        const idempotencyKey = params.idempotencyKey
            ?? this.deriveKey({ userId, template, data });
        // Check Redis first (fast path) — BullMQ deduplicates by jobId
        // The DB check below is the durable guarantee for cross-restart safety
        const alreadySent = await this.repo.hasBeenSent(idempotencyKey);
        if (alreadySent) {
            logger_1.logger.info({ idempotencyKey, userId, template }, 'Notification skipped — already sent');
            return { idempotencyKey };
        }
        const jobData = {
            idempotencyKey,
            userId,
            channels,
            subject,
            template,
            data,
        };
        const jobName = channels.length > 1 ? 'send.all' : `send.${channels[0]}`;
        await this.queue.add(jobName, jobData, {
            delay,
            jobId: idempotencyKey,
        });
        logger_1.logger.info({ idempotencyKey, userId, template, channels }, 'Notification enqueued');
        return { idempotencyKey };
    }
    // ─── Private ─────────────────────────────────────────────────────────────
    deriveKey(input) {
        const stable = JSON.stringify({ ...input, data: this.sortKeys(input.data) });
        return (0, node_crypto_1.createHash)('sha256').update(stable).digest('hex');
    }
    // Ensure consistent key ordering so the same data always hashes the same way
    sortKeys(obj) {
        return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
    }
}
exports.NotificationsQueue = NotificationsQueue;
const notificationsBackground = new NotificationsQueue();
function getNotificationsQueue() {
    return notificationsBackground;
}
function createNotificationsWorker() {
    return notificationsBackground.createWorker();
}
//# sourceMappingURL=notifications.queue.js.map