import admin from 'firebase-admin';
import { Messaging } from 'firebase-admin/messaging';
import { renderPush } from '../template-engine';
import { config } from '../../../config/env';
import { supabase } from '../../../config/supabase';
import { logger } from '../../../config/logger';

interface SendPushParams {
    userId:   string
    template: string
    data:     Record<string, unknown>
}

export class PushChannel {
    private readonly messaging: Messaging;

    constructor() {
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(config.firebase),
            });
        }

        this.messaging = admin.messaging();
    }

    async send({ userId, template, data }: SendPushParams): Promise<void> {
        const { data: tokenRow, error } = await supabase
            .from('push_tokens')
            .select('token')
            .eq('user_id', userId)
            .single();

        if (error || !tokenRow) {
            logger.warn({ userId, template }, 'Push skipped — no push token for user')
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
            token: tokenRow.token
        });

        // return {
        //     success: true,
        //     messageId: response
        // };

        logger.info({ userId, template }, 'Push notification sent')
    }
}