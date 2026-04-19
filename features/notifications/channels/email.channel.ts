import nodemailer, { Transporter } from 'nodemailer';
import { renderEmail } from '../template-engine';
import { env } from '@/data/env/server';

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
            host:   env.SMTP_HOST,
            port:   env.SMTP_PORT,
            secure: env.SMTP_SECURE === true,
            auth: {
                user: env.SMTP_USER,
                pass: env.SMTP_PASSWORD,
            },
        })
    }

    async send({ to, subject, template, data }: SendEmailParams): Promise<{ success: boolean }> {
        const html = renderEmail(template, data)

        await this.transporter.sendMail({
            from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_ADDRESS}>`,
            to,
            subject,
            html,
        })

        return { success: true }
    }
}