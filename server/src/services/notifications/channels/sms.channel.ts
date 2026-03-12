import twilio from 'twilio';
import { renderSms } from '../template-engine';
import { config } from '../../../config/env';
import { logger } from '../../../config/logger';
import { twilioClient } from '../../../config/twilio';

interface SendSmsParams {
    to:       string | null
    template: string
    data:     Record<string, unknown>
}

export class SmsChannel {

    constructor() {}

    async send({ to, template, data }: SendSmsParams): Promise<void> {
        if (!to) {
            logger.warn({ template }, 'SMS skipped — no phone number on user')
            return
        }

        const body = renderSms(template, data)

        await twilioClient.messages.create({
            to,
            from: config.twilio.fromNumber,
            body,
        })

        logger.info({ to, template }, 'SMS sent')
    }
}