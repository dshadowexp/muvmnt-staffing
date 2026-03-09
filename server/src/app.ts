import Fastify, { FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod"

import securityPlugin from './plugins/security.plugin';
import supabasePlugin from './plugins/supabase.plugin';
import jwtPlugin from './plugins/jwt.plugin';
import swaggerPlugin from './plugins/swagger.plugin';

import { registerRoutes } from './routes';
import { errorHandler } from './errors/errorHandler';
import { config } from './config/env';

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
        ajv: {
            customOptions: {
                removeAdditional: 'all',
                coerceTypes: true,
                useDefaults: true,
            },
        },
    }).withTypeProvider<ZodTypeProvider>();

    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)

    // ─── Security ─────────────────────────────────────────────────────────────
    await app.register(securityPlugin);
    

    // ─── Auth ─────────────────────────────────────────────────────────────────
    await app.register(jwtPlugin);

    // ─── Infrastructure plugins ───────────────────────────────────────────────
    await app.register(supabasePlugin);
    await app.register(swaggerPlugin);

    // ─── Routes ───────────────────────────────────────────────────────────────
    await registerRoutes(app);

    // ─── Error Handler ───────────────────────────────────────────────────────────────
    app.setErrorHandler(errorHandler);

    return app;
}