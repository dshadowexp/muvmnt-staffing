"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWorkers = startWorkers;
const logger_1 = require("../config/logger");
const notifications_queue_1 = require("./notifications.queue");
async function startWorkers(app) {
    const workers = [
        (0, notifications_queue_1.getNotificationsQueue)().createWorker(),
        // getPaymentsQueue().createWorker(), 
    ];
    // Graceful shutdown — drain and close all workers before process exits
    app.addHook('onClose', async () => {
        logger_1.logger.info(`Closing ${workers.length} BullMQ worker(s)...`);
        await Promise.all(workers.map((w) => w.close()));
        logger_1.logger.info('All BullMQ workers closed');
    });
    logger_1.logger.info({ workers: workers.map((w) => w.name) }, `${workers.length} BullMQ worker(s) started`);
}
//# sourceMappingURL=index.js.map