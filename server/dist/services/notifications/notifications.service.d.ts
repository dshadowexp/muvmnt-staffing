export type NotificationChannel = 'email' | 'sms' | 'push';
export interface SendNotificationParams {
    userId: string;
    channels: NotificationChannel | NotificationChannel[];
    subject?: string;
    template: string;
    data: Record<string, unknown>;
    delay?: number;
    idempotencyKey?: string;
}
export declare class NotificationService {
    private readonly repo;
    private readonly email;
    private readonly sms;
    private readonly push;
    constructor();
    send(params: Omit<SendNotificationParams, 'delay'> & {
        idempotencyKey: string;
    }): Promise<void>;
    upsertFcmToken(params: {
        userId: string;
        token: string;
        platform: 'ios' | 'android' | 'web';
    }): Promise<void>;
    deleteFcmToken(userId: string, platform: 'ios' | 'android' | 'web'): Promise<void>;
}
