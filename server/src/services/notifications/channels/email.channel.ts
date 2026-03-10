import nodemailer, { Transporter } from 'nodemailer';
import { renderEmail } from '../template-engine';
import { config } from '../../../config/env';
import { logger } from '../../../config/logger';

interface SendEmailParams {
    to:       string
    subject:  string
    template: string
    data:     Record<string, unknown>
}

export class EmailChannel {
    private readonly transporter: Transporter

    constructor() {
        this.transporter = nodemailer.createTransport({
            host:   config.smtp.host,
            port:   config.smtp.port,
            secure: config.smtp.secure,
            auth: {
                user: config.smtp.user,
                pass: config.smtp.pass,
            },
        })
    }

    async send({ to, subject, template, data }: SendEmailParams): Promise<void> {
        const html = renderEmail(template, data)

        await this.transporter.sendMail({
            from: `"${config.smtp.fromName}" <${config.smtp.fromAddress}>`,
            to,
            subject,
            html,
        })

        logger.info({ to, template }, 'Email sent')
    }
}