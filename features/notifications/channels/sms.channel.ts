import { env } from '@/data/env/server';
import { renderSms } from '../lib/template-engine';

interface SendSmsParams {
    to:       string | null
    template: string
    data:     Record<string, unknown>
}

export class SmsChannel {

    constructor() {}

    async send({ to, template, data }: SendSmsParams): Promise<{ success: boolean }> {
        if (!to) {
            console.warn({ template }, 'SMS skipped — no phone number on user')
            return { success: false }
        }

        const body = renderSms(template, data)

        // await twilioClient.messages.create({
        //     to,
        //     from: env.TWILIO_FROM_NUMBER,
        //     body,
        // })

        return { success: true }
    }
}