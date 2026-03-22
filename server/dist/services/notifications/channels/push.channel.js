"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushChannel = void 0;
const template_engine_1 = require("../template-engine");
const supabase_1 = require("../../../config/supabase");
const logger_1 = require("../../../config/logger");
const firebase_1 = require("../../../config/firebase");
class PushChannel {
    messaging;
    constructor() {
        this.messaging = (0, firebase_1.getMessaging)();
    }
    async send({ userId, template, data }) {
        const { data: tokenRow, error } = await supabase_1.supabase
            .from('push_tokens')
            .select('token')
            .eq('user_id', userId)
            .single();
        if (error || !tokenRow) {
            logger_1.logger.warn({ userId, template }, 'Push skipped — no push token for user');
            return;
        }
        const { title, body } = (0, template_engine_1.renderPush)(template, data);
        const message = {
            notification: {
                title,
                body,
            },
            data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
            android: {
                priority: 'high',
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                    },
                },
            },
        };
        const response = await this.messaging.send({
            ...message,
            token: tokenRow.token
        });
        // return {
        //     success: true,
        //     messageId: response
        // };
        logger_1.logger.info({ userId, template }, 'Push notification sent');
    }
}
exports.PushChannel = PushChannel;
//# sourceMappingURL=push.channel.js.map