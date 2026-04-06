
import { Messaging } from 'firebase-admin/messaging';
import { renderPush } from '../template-engine';
import { config } from '../../../config/env';
import { supabase } from '../../../config/supabase';
import { logger } from '../../../config/logger';
import { getMessaging } from '../../../config/firebase';

interface SendPushParams {
    token:   string
    template: string
    data:     Record<string, unknown>
}

export class PushChannel {
    private readonly messaging: Messaging;

    constructor() {
        this.messaging = getMessaging();
    }

    async send({ token, template, data }: SendPushParams): Promise<void> {
        if (!token) {
            logger.warn({ template }, 'Push skipped — no push token for user')
            return
        }

        const { title, body } = renderPush(template, data)

        const message = {
            notification: {
                title,
                body,
            },
            data: Object.fromEntries(
                Object.entries(data).map(([k, v]) => [k, String(v)])
            ),
            android: {
                priority: 'high' as 'high' | 'normal',
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                    },
                },
            },
        };

        
        const response = await this.messaging!.send({
            ...message,
            token: token
        });

        // return {
        //     success: true,
        //     messageId: response
        // };

        logger.info({ token, template }, 'Push notification sent')
    }
}