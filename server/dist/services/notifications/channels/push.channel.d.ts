interface SendPushParams {
    userId: string;
    template: string;
    data: Record<string, unknown>;
}
export declare class PushChannel {
    private readonly messaging;
    constructor();
    send({ userId, template, data }: SendPushParams): Promise<void>;
}
export {};
