import { Worker } from "bullmq";
import { BaseQueue } from "./base.queue";
export interface ProcessShiftJobData {
    idempotencyKey: string;
    shiftId: string;
    event: 'processing' | 'succeeded' | 'failed' | 'refunded';
}
export type ShiftJobName = 'shift.processing' | 'shift.succeeded' | 'shift.failed' | (string & {});
export declare class ShiftsQueue extends BaseQueue<ProcessShiftJobData, ShiftJobName> {
    createWorker(): Worker<ProcessShiftJobData, void, ShiftJobName>;
}
