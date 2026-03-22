import { NotificationChannel } from './notifications.service';
interface UserContactRecord {
    id: string;
    email: string;
    phone: string | null;
}
interface CreateNotificationParams {
    idempotencyKey: string;
    userId: string;
    channels: NotificationChannel[];
    template: string;
    data: Record<string, unknown>;
}
export declare class NotificationRepository {
    constructor();
    findUserById(userId: string): Promise<UserContactRecord | null>;
    hasBeenSent(idempotencyKey: string): Promise<boolean>;
    createNotification({ idempotencyKey, userId, channels, template, data, }: CreateNotificationParams): Promise<void>;
    upsertFcmToken(params: {
        userId: string;
        token: string;
        platform: 'ios' | 'android' | 'web';
    }): Promise<void>;
    deleteFcmToken(userId: string, platform: 'ios' | 'android' | 'web'): Promise<void>;
}
export {};
