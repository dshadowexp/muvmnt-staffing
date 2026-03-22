"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftsQueue = void 0;
const bullmq_1 = require("bullmq");
const base_queue_1 = require("./base.queue");
const logger_1 = require("../config/logger");
class ShiftsQueue extends base_queue_1.BaseQueue {
    createWorker() {
        const worker = new bullmq_1.Worker(this.queueName, async (job) => {
            logger_1.logger.info({ jobId: job.id, jobName: job.name }, 'Processing shift job');
        });
        this.workerLogger(worker);
        return worker;
    }
}
exports.ShiftsQueue = ShiftsQueue;
//# sourceMappingURL=shifts.queue.js.map