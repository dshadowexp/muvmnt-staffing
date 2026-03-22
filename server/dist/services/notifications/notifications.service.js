"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const logger_1 = require("../../config/logger");
const notifications_repository_1 = require("./notifications.repository");
const email_channel_1 = require("./channels/email.channel");
const sms_channel_1 = require("./channels/sms.channel");
const push_channel_1 = require("./channels/push.channel");
// ─── Service ──────────────────────────────────────────────────────────────────
class NotificationService {
    repo;
    email;
    sms;
    push;
    constructor() {
        this.repo = new notifications_repository_1.NotificationRepository();
        this.email = new email_channel_1.EmailChannel();
        this.sms = new sms_channel_1.SmsChannel();
        this.push = new push_channel_1.PushChannel();
    }
    // ─── Send (blocking, called by worker only) ───────────────────────────────
    async send(params) {
        const { idempotencyKey, userId, subject, template, data } = params;
        const channels = Array.isArray(params.channels) ? params.channels : [params.channels];
        // Durable idempotency check — guards against duplicate delivery if the
        // worker retries after a crash mid-send
        const alreadySent = await this.repo.hasBeenSent(idempotencyKey);
        if (alreadySent) {
            logger_1.logger.info({ idempotencyKey }, 'Notification send skipped — already recorded');
            return;
        }
        const user = await this.repo.findUserById(userId);
        if (!user)
            throw new Error(`User ${userId} not found`);
        const results = await Promise.allSettled(channels.map((ch) => {
            switch (ch) {
                case 'email':
                    return this.email.send({ to: user.email, subject: subject ?? template, template, data });
                case 'sms':
                    return this.sms.send({ to: user.phone, template, data });
                case 'push':
                    return this.push.send({ userId: user.id, template, data });
            }
        }));
        results.forEach((result, i) => {
            if (result.status === 'rejected') {
                logger_1.logger.error({ channel: channels[i], userId, template, err: result.reason }, 'Channel delivery failed');
            }
        });
        // Persist with idempotency key — unique constraint ensures exactly-once recording
        await this.repo.createNotification({ idempotencyKey, userId, channels, template, data });
    }
    // ─── FCM token management ─────────────────────────────────────────────────
    async upsertFcmToken(params) {
        await this.repo.upsertFcmToken(params);
        logger_1.logger.info({ userId: params.userId, platform: params.platform }, 'FCM token upserted');
    }
    async deleteFcmToken(userId, platform) {
        await this.repo.deleteFcmToken(userId, platform);
        logger_1.logger.info({ userId, platform }, 'FCM token deleted');
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=notifications.service.js.map