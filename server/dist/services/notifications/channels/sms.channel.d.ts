interface SendSmsParams {
    to: string | null;
    template: string;
    data: Record<string, unknown>;
}
export declare class SmsChannel {
    constructor();
    send({ to, template, data }: SendSmsParams): Promise<void>;
}
export {};
