import { config } from './config/env';
import { logger } from './config/logger';
import { buildApp } from './app'
import { startWorkers } from './background';

// import { startKafkaConsumers } from './kafka/consumers'

const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM'] as const
const SHUTDOWN_TIMEOUT_MS = 10_000

async function main() {
    const app = await buildApp();
  
    // ─── Start background services ────────────────────────────────────────────
    // await startKafkaConsumers(app)
    await startWorkers(app);
  
    // ─── Start HTTP server ────────────────────────────────────────────────────
    const port = config.port;
    const host = config.host;
  
    await app.listen({ port, host });
  
    // ─── Graceful shutdown ────────────────────────────────────────────────────
    const shutdown = async (signal: string) => {
        logger.info({ signal }, 'Shutdown signal received');
    
        const forceExit = setTimeout(() => {
            logger.error('Graceful shutdown timed out — forcing exit');
            process.exit(1);
        }, SHUTDOWN_TIMEOUT_MS);
    
        forceExit.unref(); // don't keep the event loop alive just for this
    
        try {
            // Close HTTP server (stop accepting new requests)
            await app.close();
    
            // BullMQ workers and Kafka consumers are closed inside their own
            // plugins via fastify's onClose hook — no manual teardown needed here.
    
            logger.info('Shutdown complete');
            clearTimeout(forceExit);
            process.exit(0);
        } catch (err) {
            logger.error({ err }, 'Error during shutdown');
            process.exit(1);
        }
    }
  
    for (const signal of SHUTDOWN_SIGNALS) {
        process.once(signal, () => shutdown(signal));
    }
  
    process.on('uncaughtException', (err) => {
        logger.fatal({ err }, 'Uncaught exception');
        shutdown('uncaughtException');
    });
  
    process.on('unhandledRejection', (reason) => {
        logger.fatal({ reason }, 'Unhandled promise rejection');
        shutdown('unhandledRejection');
    });
}
  
main().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
  