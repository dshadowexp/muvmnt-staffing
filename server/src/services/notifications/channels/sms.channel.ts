import twilio from 'twilio';
import { renderSms } from '../template-engine';
import { config } from '../../../config/env';
import { logger } from '../../../config/logger';

interface SendSmsParams {
    to:       string | null
    template: string
    data:     Record<string, unknown>
}

export class SmsChannel {
    private readonly client: twilio.Twilio

    constructor() {
        this.client = twilio(
            config.twilio.accountSid,
            config.twilio.authToken
        )
    }

    async send({ to, template, data }: SendSmsParams): Promise<void> {
        if (!to) {
            logger.warn({ template }, 'SMS skipped — no phone number on user')
            return
        }

        const body = renderSms(template, data)

        await this.client.messages.create({
            to,
            from: config.twilio.fromNumber,
            body,
        })

        logger.info({ to, template }, 'SMS sent')
    }
}