import { resendClient } from '@/services/resend/client';
import { renderEmail } from '../template-engine';
import { Resend } from 'resend';

interface SendEmailParams {
    to:       string
    subject:  string
    template: string
    data:     Record<string, unknown>
}

export class EmailChannel {
    private readonly resend: Resend

    constructor() {
        this.resend = resendClient;
    }

    async send({ to, subject, template, data }: SendEmailParams): Promise<{ success: boolean }> {
        const html = renderEmail(template, data);

        await this.resend.emails.send({
            from: `Diana @ReadyKare <diana@readykare.com>`,
            to,
            subject,
            html,
        });

        return { success: true };
    }
}