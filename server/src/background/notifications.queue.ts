import { createHash } from 'node:crypto';
import { Worker, Job } from 'bullmq'
import { BaseQueue } from "./base.queue";
import { NotificationService, NotificationChannel, SendNotificationParams } from '../services/notifications/notifications.service'
import { logger } from "../config/logger";
import { config } from "../config/env";
import { NotificationRepository } from '../services/notifications/notifications.repository';

// ─── Job data ─────────────────────────────────────────────────────────────────

export interface NotificationJobData {
    idempotencyKey: string
    userId:         string
    channels:       NotificationChannel[]
    subject?:       string
    template:       string
    data:           Record<string, unknown>
}

export type NotificationJobName =
    | 'send.email'
    | 'send.sms'
    | 'send.push'
    | 'send.all'
    | (string & {});

export class NotificationsQueue extends BaseQueue<NotificationJobData, NotificationJobName> {
    private readonly service: NotificationService;
    private readonly repo: NotificationRepository;

    constructor() {
        super('notifications');
        this.service = new NotificationService();
        this.repo = new NotificationRepository();
    }

    createWorker() {
        const worker = new Worker<NotificationJobData, void, NotificationJobName>(
            this.queueName,
            async (job: Job<NotificationJobData, void, NotificationJobName>) => {
                const { idempotencyKey, userId, channels, subject, template, data } = job.data
    
                logger.info({ jobId: job.id, idempotencyKey, userId, template }, 'Processing notification job');
    
                await this.service.send({ idempotencyKey, userId, channels, subject, template, data })
            },
            {
                connection:  config.redis.node,
                concurrency: this.concurrency,
            }
        )
    
        this.workerLogger(worker);
    
        return worker
    }

    // ─── Enqueue (non-blocking, called from routes) ───────────────────────────

    async enqueue(params: SendNotificationParams): Promise<{ idempotencyKey: string }> {
        const { userId, subject, template, data, delay } = params
        const channels = Array.isArray(params.channels) ? params.channels : [params.channels]

        // Derive a stable key from the intent if caller didn't supply one.
        // Same user + template + data always produces the same key — safe to retry.
        const idempotencyKey = params.idempotencyKey
        ?? this.deriveKey({ userId, template, data });

        // Check Redis first (fast path) — BullMQ deduplicates by jobId
        // The DB check below is the durable guarantee for cross-restart safety
        const alreadySent = await this.repo.hasBeenSent(idempotencyKey)
        if (alreadySent) {
            logger.info({ idempotencyKey, userId, template }, 'Notification skipped — already sent')
            return { idempotencyKey }
        }

        const jobData: NotificationJobData = {
            idempotencyKey,
            userId,
            channels,
            subject,
            template,
            data,
        }

        const jobName: NotificationJobName = channels.length > 1 ? 'send.all' : `send.${channels[0]}`

        await this.queue.add(jobName, jobData, {
            delay,
            jobId: idempotencyKey,
        })

        logger.info({ idempotencyKey, userId, template, channels }, 'Notification enqueued')
        return { idempotencyKey }
    }

    // ─── Private ─────────────────────────────────────────────────────────────
    private deriveKey(input: { userId: string; template: string; data: Record<string, unknown> }): string {
        const stable = JSON.stringify({ ...input, data: this.sortKeys(input.data) })
        return createHash('sha256').update(stable).digest('hex')
    }

    // Ensure consistent key ordering so the same data always hashes the same way
    private sortKeys(obj: Record<string, unknown>): Record<string, unknown> {
        return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)))
    }
}

const notificationsBackground = new NotificationsQueue();

export function getNotificationsQueue() {
    return notificationsBackground;
}

export function createNotificationsWorker() {
    return notificationsBackground.createWorker();
}