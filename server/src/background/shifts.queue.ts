import { Job, Worker } from "bullmq";
import { BaseQueue } from "./base.queue"
import { logger } from "../config/logger";


export interface ProcessShiftJobData {
    idempotencyKey: string
    shiftId: string
    event: 'processing' | 'succeeded' | 'failed' | 'refunded'
}

export type ShiftJobName = 'shift.processing' | 'shift.succeeded' | 'shift.failed' | (string & {});

export class ShiftsQueue extends BaseQueue<ProcessShiftJobData, ShiftJobName> {
    createWorker() {
        const worker = new Worker<ProcessShiftJobData, void, ShiftJobName>(
            this.queueName,
            async (job: Job<ProcessShiftJobData, void, ShiftJobName>) => {
                logger.info({ jobId: job.id, jobName: job.name }, 'Processing shift job');
            }
        );

        this.workerLogger(worker);

        return worker
    }
    
}