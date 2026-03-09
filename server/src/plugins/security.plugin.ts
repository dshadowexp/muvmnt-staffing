import fp from "fastify-plugin";
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet'
import fastifyRateLimit from '@fastify/rate-limit';
import { config } from "../config/env";
// import { getRedisCluster } from "../config/redis";

export default fp(async (fastify) => {
    await fastify.register(fastifyHelmet, {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https:']
            }
        }
    });

    await fastify.register(fastifyCors, {
        origin: config.corsOrigin ?? '*',
        credentials: true,
    });
    
    await fastify.register(fastifyRateLimit, {
        max: config.rateLimit.max,
        timeWindow: config.rateLimit.timeWindow,
        // redis: getRedisCluster(),
        skipOnError: false,
        addHeaders: {
            'x-ratelimit-limit': true,
            'x-ratelimit-remaining': true,
            'x-ratelimit-reset': true,
            'retry-after': true
        }
    });
});