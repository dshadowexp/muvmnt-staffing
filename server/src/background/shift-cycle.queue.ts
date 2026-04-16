import { Job, Worker, type Processor } from 'bullmq';
import { BaseQueue } from './base.queue';
import { logger } from '../config/logger';
import { config } from '../config/env';
import {
  processShiftTransferJob,
  restoreStuckReassigningShift,
  type ShiftTransferJobPayload,
} from '../services/shifts/shift-reassignment.service';
import { processShiftPayoutJob } from '../services/shifts/shift-payout.service';

export const SHIFT_CYCLE_JOB_REPLACEMENT = 'shift.transfer.findReplacement' as const;
export const SHIFT_CYCLE_JOB_PAYOUT = 'shift.payout.workerEarnings' as const;

export type ShiftCycleJobName =
  | typeof SHIFT_CYCLE_JOB_REPLACEMENT
  | typeof SHIFT_CYCLE_JOB_PAYOUT;

export class ShiftsCycleQueue extends BaseQueue<unknown, string> {
  constructor() {
    super('shift-cycle', 2);
  }

  createWorker() {
    const processor: Processor = async (job: Job) => {
      switch (job.name) {
        case SHIFT_CYCLE_JOB_REPLACEMENT:
          await processShiftTransferJob(job.data as ShiftTransferJobPayload);
          break;
        case SHIFT_CYCLE_JOB_PAYOUT:
          await processShiftPayoutJob((job.data as { shiftId: string }).shiftId);
          break;
        default:
          logger.warn({ jobName: job.name }, 'shift-cycle: unknown job name');
      }
    };

    const worker = new Worker(this.queueName, processor, {
      connection:  config.redis.node,
      concurrency: this.concurrency,
    });

    this.workerLogger(worker as Worker<unknown, void, string>);

    worker.on('failed', (job) => {
      if (job?.name !== SHIFT_CYCLE_JOB_REPLACEMENT || job?.data == null) return;
      const maxAttempts = job.opts.attempts ?? 1;
      if (job.attemptsMade < maxAttempts) return;
      const payload = job.data as ShiftTransferJobPayload;
      void restoreStuckReassigningShift(payload.shiftId, payload.previousStatus).catch(
        (err) => {
          logger.error(
            { err, shiftId: job?.data != null ? (job.data as ShiftTransferJobPayload).shiftId : undefined },
            'shift.transfer: failed-handler restore error',
          );
        },
      );
    });

    return worker;
  }

  async enqueueReplacementTransfer(payload: ShiftTransferJobPayload): Promise<void> {
    await this.queue.add(SHIFT_CYCLE_JOB_REPLACEMENT, payload, {
      jobId: `shift-transfer-${payload.shiftId}`,
    });
    logger.info({ shiftId: payload.shiftId }, 'shift.transfer job enqueued');
  }

  async enqueueWorkerPayoutForShift(shiftId: string): Promise<void> {
    await this.queue.add(SHIFT_CYCLE_JOB_PAYOUT, { shiftId }, {
      jobId: `shift-payout-${shiftId}`,
    });
    logger.info({ shiftId }, 'shift.payout job enqueued');
  }
}

const shiftCycleQueue = new ShiftsCycleQueue();

export function getShiftsCycleQueue(): ShiftsCycleQueue {
  return shiftCycleQueue;
}
