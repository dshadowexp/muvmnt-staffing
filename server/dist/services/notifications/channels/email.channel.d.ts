interface SendEmailParams {
    to: string;
    subject: string;
    template: string;
    data: Record<string, unknown>;
}
export declare class EmailChannel {
    private readonly transporter;
    constructor();
    send({ to, subject, template, data }: SendEmailParams): Promise<void>;
}
export {};
