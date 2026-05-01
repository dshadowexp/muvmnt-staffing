import { Messaging } from 'firebase-admin/messaging';
import { renderPush } from '../lib/template-engine';
import { getAdminMessaging } from '@/services/firebase/admin';

interface SendPushParams {
    token:   string
    template: string
    data:     Record<string, unknown>
}

export class PushChannel {
    private readonly messaging: Messaging;

    constructor() {
        this.messaging = getAdminMessaging();
    }

    async send({ token, template, data }: SendPushParams): Promise<{ success: boolean, messageId?: string }> {
        if (!token) {
            console.warn({ template }, 'Push skipped — no push token for user')
            return { success: false }
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

        return {
            success: true,
            messageId: response
        };
    }
}