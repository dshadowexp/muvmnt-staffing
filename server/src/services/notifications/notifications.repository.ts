import { NotificationChannel } from './notifications.service';
import { supabase } from '../../config/supabase';

interface UserContactRecord {
    id:    string
    email: string
    phone: string | null
}

interface CreateNotificationParams {
    idempotencyKey: string
    userId:         string
    channels:       NotificationChannel[]
    template:       string
    data:           Record<string, unknown>
}

export class NotificationRepository {
    constructor() {}

    async findUserById(userId: string): Promise<UserContactRecord | null> {
        const { data, error } = await supabase
            .from('users')
            .select('id, email, phone')
            .eq('id', userId)
            .single();

        if (error) return null;
        return data as UserContactRecord;
    }

    // Returns true if this key has already been processed
    async hasBeenSent(idempotencyKey: string): Promise<boolean> {
        const { data } = await supabase
            .from('notifications')
            .select('id')
            .eq('idempotency_key', idempotencyKey)
            .single()

        return !!data
    }

    async createNotification({
        idempotencyKey,
        userId,
        channels,
        template,
        data,
    }: CreateNotificationParams): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .insert({
                idempotency_key: idempotencyKey,
                user_id:         userId,
                channels,
                template,
                data,
                sent_at:         new Date().toISOString(),
            });

        // Unique constraint violation on idempotency_key — silently ignore,
        // a concurrent worker already processed this job
        if (error && error.code !== '23505') {
            throw new Error(`Failed to record notification: ${error.message}`)
        }
    }

    // ─── FCM tokens ───────────────────────────────────────────────────────────

    async upsertFcmToken(params: {
        userId:   string
        token:    string
        platform: 'ios' | 'android' | 'web'
    }): Promise<void> {
        const { error } = await supabase
            .from('push_tokens')
            .upsert(
                {
                    user_id:    params.userId,
                    token:      params.token,
                    platform:   params.platform,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id,platform' } // one token per user per platform
        );

        if (error) throw new Error(`Failed to upsert FCM token: ${error.message}`)
    }

    async deleteFcmToken(userId: string, platform: 'ios' | 'android' | 'web'): Promise<void> {
        const { error } = await supabase
            .from('push_tokens')
            .delete()
            .eq('user_id', userId)
            .eq('platform', platform);

        if (error) throw new Error(`Failed to delete FCM token: ${error.message}`)
    }
}