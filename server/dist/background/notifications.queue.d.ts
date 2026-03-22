import { Worker } from 'bullmq';
import { BaseQueue } from "./base.queue";
import { NotificationChannel, SendNotificationParams } from '../services/notifications/notifications.service';
export interface NotificationJobData {
    idempotencyKey: string;
    userId: string;
    channels: NotificationChannel[];
    subject?: string;
    template: string;
    data: Record<string, unknown>;
}
export type NotificationJobName = 'send.email' | 'send.sms' | 'send.push' | 'send.all' | (string & {});
export declare class NotificationsQueue extends BaseQueue<NotificationJobData, NotificationJobName> {
    private readonly service;
    private readonly repo;
    constructor();
    createWorker(): Worker<NotificationJobData, void, NotificationJobName>;
    enqueue(params: SendNotificationParams): Promise<{
        idempotencyKey: string;
    }>;
    private deriveKey;
    private sortKeys;
}
export declare function getNotificationsQueue(): NotificationsQueue;
export declare function createNotificationsWorker(): Worker<NotificationJobData, void, NotificationJobName>;
