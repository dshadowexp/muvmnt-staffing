import { env } from '@/data/env/server';
import { renderSms } from '../template-engine';
import { twilioClient } from '@/services/twilio/client';

interface SendSmsParams {
    to:       string | null
    template: string
    data:     Record<string, unknown>
}

export class SmsChannel {

    constructor() {}

    async send({ to, template, data }: SendSmsParams): Promise<void> {
        if (!to) {
            console.warn({ template }, 'SMS skipped — no phone number on user')
            return
        }

        const body = renderSms(template, data)

        await twilioClient.messages.create({
            to,
            from: env.TWILIO_FROM_NUMBER,
            body,
        })

        console.info({ to, template }, 'SMS sent')
    }
}