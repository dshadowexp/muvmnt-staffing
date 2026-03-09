import dotenv from 'dotenv';
dotenv.config();

import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
    PORT: z.string().transform(Number).default(3000),
    HOST: z.string().default('0.0.0.0'),
    CORS_ORIGIN: z.string().default('*'),
    LOG_LEVEL: z.string().default('info'),

    JWT_SECRET: z.string(),
    JWT_EXPIRES_IN: z.string().default('15m'),

    RATE_LIMIT_MAX: z.string().transform(Number).default(100),
    RATE_LIMIT_WINDOW: z.string().transform(Number).default(60000),
    
    REDIS_CLUSTER_NODES: z.string(),
    REDIS_PASSWORD: z.string().optional(),

    SUPABASE_URL: z.string(),
    SUPABASE_SERVICE_ROLE_KEY: z.string(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const config = {
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    host: parsed.data.HOST,
    corsOrigin: '*',
    logLevel: '',

    jwtSecret: parsed.data.JWT_SECRET,
    jwtExpiresIn: parsed.data.JWT_EXPIRES_IN,

    rateLimit: {
        max: parsed.data.RATE_LIMIT_MAX,
        timeWindow: parsed.data.RATE_LIMIT_WINDOW
    },
    
    redis: {
        clusterNodes: parsed.data.REDIS_CLUSTER_NODES,
        password: parsed.data.REDIS_PASSWORD
    },
};