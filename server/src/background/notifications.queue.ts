import { createHash } from 'node:crypto';
import { Worker, Job } from 'bullmq'
import { BaseQueue } from "./base.queue";
import { logger } from "../config/logger";
import { config } from "../config/env";
import { NotificationChannel } from '../services/notifications/notifications.service'
import { supabase } from '../config/supabase';
import { EmailChannel } from '../services/notifications/channels/email.channel';
import { PushChannel } from '../services/notifications/channels/push.channel';
import { SmsChannel } from '../services/notifications/channels/sms.channel';

// ─── Job data ─────────────────────────────────────────────────────────────────

export interface EnqueueNotificationParams {
    idempotencyKey?: string
    delay?:          number
    userId:         string
    channels:       NotificationChannel[]
    subject?:       string
    template:       string
    data:           Record<string, unknown>
}

export interface NotificationJobData extends EnqueueNotificationParams {
    userData:  { email: string; phone_number: string; push_token: string }
}

export type NotificationJobName =
    | 'send.email'
    | 'send.sms'
    | 'send.push'
    | 'send.all'
    | (string & {});

export class NotificationsQueue extends BaseQueue<NotificationJobData, NotificationJobName> {
    private readonly email: EmailChannel
    private readonly sms:   SmsChannel;
    private readonly push:  PushChannel

    constructor() {
        super('send-notifications', 5);
        this.email = new EmailChannel();
        this.sms   = new SmsChannel();
        this.push  = new PushChannel();
    }

    createWorker() {
        const worker = new Worker<NotificationJobData, void, NotificationJobName>(
            this.queueName,
            async (job: Job<NotificationJobData, void, NotificationJobName>) => {
                await this.dispatch(job.data);
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

    async enqueue(params: EnqueueNotificationParams): Promise<void> {
        const { userId, subject, template, data } = params
        const channels = Array.isArray(params.channels) ? params.channels : [params.channels]

        // Derive a stable key from the intent if caller didn't supply one.
        // Same user + template + data always produces the same key — safe to retry.
        const idempotencyKey = params.idempotencyKey
        ?? this.deriveKey({ userId, template, data });

        const existingJob = await this.queue.getJob(idempotencyKey);
        if (existingJob) {
            const state = await existingJob.getState();
            if (state === 'completed' || state === 'failed') {
                logger.info({ idempotencyKey, userId, template }, 'Notification skipped — already enqueued')
                return;
            }
            logger.info({ idempotencyKey, userId, template }, 'Notification skipped — already enqueued')
            return;
        }

        const { data: userData, error } = await supabase
            .from('users')
            .select('email, phone_number, push_token')
            .eq('id', userId)
            .single();

        if (error) throw new Error(`Failed to find user ${userId}: ${error?.message}`);
        if (!userData) throw new Error(`User ${userId} not found`);

        const userNotificationData = { email: userData.email, phone_number: userData.phone_number, push_token: userData.push_token };

        const jobData: NotificationJobData = {
            idempotencyKey,
            userId,
            userData: userNotificationData,
            channels,
            subject,
            template,
            data,
        }

        const jobName: NotificationJobName = channels.length > 1 ? 'send.all' : `send.${channels[0]}`

        await this.queue.add(jobName, jobData, {
            jobId: idempotencyKey,
        })

        logger.info({ idempotencyKey, userId, template, channels }, 'Notification enqueued')
    }

    // ─── Private ─────────────────────────────────────────────────────────────
    private async dispatch(payload: NotificationJobData): Promise<void> {
        const { userId, subject, template, data, userData } = payload;
        const channels = Array.isArray(payload.channels) ? payload.channels : [payload.channels];

        const results = await Promise.allSettled(
            channels.map((ch) => {
                switch (ch) {
                case 'email':
                    return this.email.send({ to: userData.email, subject: subject ?? template, template, data })
                case 'sms':
                    return this.sms.send({ to: userData.phone_number, template, data })
                case 'push':
                    return this.push.send({ token:  userData.push_token, template, data })
                }
            })
        )

        results.forEach((result, i) => {
            if (result.status === 'rejected') {
                logger.error(
                  { channel: channels[i], userId, template, err: result.reason },
                  'Channel delivery failed'
                )
            }
        })
    }

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