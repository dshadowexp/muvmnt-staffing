"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationRepository = void 0;
const supabase_1 = require("../../config/supabase");
class NotificationRepository {
    constructor() { }
    async findUserById(userId) {
        const { data, error } = await supabase_1.supabase
            .from('users')
            .select('id, email, phone')
            .eq('id', userId)
            .single();
        if (error)
            return null;
        return data;
    }
    // Returns true if this key has already been processed
    async hasBeenSent(idempotencyKey) {
        const { data } = await supabase_1.supabase
            .from('notifications')
            .select('id')
            .eq('idempotency_key', idempotencyKey)
            .single();
        return !!data;
    }
    async createNotification({ idempotencyKey, userId, channels, template, data, }) {
        const { error } = await supabase_1.supabase
            .from('notifications')
            .insert({
            idempotency_key: idempotencyKey,
            user_id: userId,
            channels,
            template,
            data,
            sent_at: new Date().toISOString(),
        });
        // Unique constraint violation on idempotency_key — silently ignore,
        // a concurrent worker already processed this job
        if (error && error.code !== '23505') {
            throw new Error(`Failed to record notification: ${error.message}`);
        }
    }
    // ─── FCM tokens ───────────────────────────────────────────────────────────
    async upsertFcmToken(params) {
        const { error } = await supabase_1.supabase
            .from('push_tokens')
            .upsert({
            user_id: params.userId,
            token: params.token,
            platform: params.platform,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,platform' } // one token per user per platform
        );
        if (error)
            throw new Error(`Failed to upsert FCM token: ${error.message}`);
    }
    async deleteFcmToken(userId, platform) {
        const { error } = await supabase_1.supabase
            .from('push_tokens')
            .delete()
            .eq('user_id', userId)
            .eq('platform', platform);
        if (error)
            throw new Error(`Failed to delete FCM token: ${error.message}`);
    }
}
exports.NotificationRepository = NotificationRepository;
//# sourceMappingURL=notifications.repository.js.map