export declare function renderEmail(template: string, data: Record<string, unknown>): string;
export declare function renderSms(template: string, data: Record<string, unknown>): string;
export declare function renderPush(template: string, data: Record<string, unknown>): {
    title: string;
    body: string;
};
