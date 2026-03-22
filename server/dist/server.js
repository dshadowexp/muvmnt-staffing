"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const app_1 = require("./app");
const background_1 = require("./background");
// import { startKafkaConsumers } from './kafka/consumers'
const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM'];
const SHUTDOWN_TIMEOUT_MS = 10_000;
async function main() {
    const app = await (0, app_1.buildApp)();
    // ─── Start background services ────────────────────────────────────────────
    // await startKafkaConsumers(app)
    await (0, background_1.startWorkers)(app);
    // ─── Start HTTP server ────────────────────────────────────────────────────
    const port = env_1.config.port;
    const host = env_1.config.host;
    await app.listen({ port, host });
    // ─── Graceful shutdown ────────────────────────────────────────────────────
    const shutdown = async (signal) => {
        logger_1.logger.info({ signal }, 'Shutdown signal received');
        const forceExit = setTimeout(() => {
            logger_1.logger.error('Graceful shutdown timed out — forcing exit');
            process.exit(1);
        }, SHUTDOWN_TIMEOUT_MS);
        forceExit.unref(); // don't keep the event loop alive just for this
        try {
            // Close HTTP server (stop accepting new requests)
            await app.close();
            // BullMQ workers and Kafka consumers are closed inside their own
            // plugins via fastify's onClose hook — no manual teardown needed here.
            logger_1.logger.info('Shutdown complete');
            clearTimeout(forceExit);
            process.exit(0);
        }
        catch (err) {
            logger_1.logger.error({ err }, 'Error during shutdown');
            process.exit(1);
        }
    };
    for (const signal of SHUTDOWN_SIGNALS) {
        process.once(signal, () => shutdown(signal));
    }
    process.on('uncaughtException', (err) => {
        logger_1.logger.fatal({ err }, 'Uncaught exception');
        shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason) => {
        logger_1.logger.fatal({ reason }, 'Unhandled promise rejection');
        shutdown('unhandledRejection');
    });
}
main().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
//# sourceMappingURL=server.js.map