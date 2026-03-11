import { config } from './config/env';
import Fastify, { FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod"

import securityPlugin from './plugins/security.plugin';
import authPlugin from './plugins/auth.plugin';
import rawBodyPlugin from './plugins/rawBody.plugin';
import swaggerPlugin from './plugins/swagger.plugin';


import { registerRoutes } from './routes';
import { errorHandler } from './errors/errorHandler';

export async function buildApp(): Promise<FastifyInstance> {
    const app = Fastify({
        logger: {
            level: config.logLevel,
            ...(config.nodeEnv === 'development' && {
                transport: {
                    target: 'pino-pretty',
                    options: { colorize: true, translateTime: 'HH:MM:ss' },
                },
            }),
        },
        // ajv: {
        //     customOptions: {
        //         removeAdditional: 'all',
        //         coerceTypes: true,
        //         useDefaults: true,
        //     },
        // },
    }).withTypeProvider<ZodTypeProvider>();

    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)

    // ─── Security ─────────────────────────────────────────────────────────────
    await app.register(securityPlugin);

    // ─── Security ─────────────────────────────────────────────────────────────
    await app.register(authPlugin);

    // ─── Infrastructure plugins ───────────────────────────────────────────────
    await app.register(rawBodyPlugin);
    await app.register(swaggerPlugin);

    // ─── Routes ───────────────────────────────────────────────────────────────
    await registerRoutes(app);

    // ─── Error Handler ───────────────────────────────────────────────────────────────
    app.setErrorHandler(errorHandler);

    return app;
}