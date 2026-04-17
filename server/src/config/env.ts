import dotenv from 'dotenv';
dotenv.config();

import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
    PORT: z.string().transform(Number).default(3000),
    HOST: z.string().default('0.0.0.0'),
    APP_URL: z.string().optional(),
    /** Worker app / marketing site — used in shift emails and HTML redirects. */
    WEB_APP_URL: z.string().optional(),
    CORS_ORIGIN: z.string().default('*'),
    ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
    LOG_LEVEL: z.string().default('info'),
    REDIS_CLUSTER: z.string().transform(Boolean).default(false),

    JWT_SECRET: z.string(),
    JWT_EXPIRES_IN: z.string().transform(Number).default(60 * 60 * 24),

    RATE_LIMIT_MAX: z.string().transform(Number).default(100),
    RATE_LIMIT_WINDOW: z.string().transform(Number).default(60000),
    
    REDIS_CLUSTER_NODES: z.string().transform(Number).default(1),
    REDIS_HOST: z.string(),
    REDIS_PORT: z.string().transform(Number).default(6379),
    REDIS_USERNAME: z.string(),
    REDIS_PASSWORD: z.string(),

    SUPABASE_URL: z.string(),
    SUPABASE_SERVICE_ROLE_KEY: z.string(),

    SMTP_HOST: z.string(),
    SMTP_PORT: z.string().transform(Number),
    SMTP_SECURE: z.string().transform(Boolean),
    SMTP_USER: z.string(),
    SMTP_PASSWORD: z.string(),
    SMTP_FROM_ADDRESS: z.string(),
    SMTP_FROM_NAME: z.string(),

    TWILIO_ACCOUNT_SID: z.string(),
    TWILIO_AUTH_TOKEN: z.string(),
    TWILIO_FROM_NUMBER: z.string(),
    TWILIO_MESSAGING_ID: z.string(),

    FIREBASE_PROJECT_ID: z.string(),
    FIREBASE_CLIENT_EMAIL: z.string(),
    FIREBASE_PRIVATE_KEY: z.string(),

    STRIPE_SECRET_KEY: z.string(),
    STRIPE_WEBHOOK_SECRET: z.string(),
    STRIPE_DEFAULT_CURRENCY: z.string().default('cad'),

    GOOGLE_MAPS_API_KEY: z.string(),
    GOOGLE_MAPS_URL: z.string(),
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
    appUrl: parsed.data.APP_URL ?? `http://localhost:${parsed.data.PORT}`,
    webAppUrl: parsed.data.WEB_APP_URL?.trim() ?? `http://localhost:3000`,
    corsOrigin: '*',
    allowedOrigins: parsed.data.ALLOWED_ORIGINS.split(','),
    logLevel: 'info',
    redisCluster: parsed.data.REDIS_CLUSTER,

    jwt: {
        secret: parsed.data.JWT_SECRET,
        expiresIn: parsed.data.JWT_EXPIRES_IN
    },

    rateLimit: {
        max: parsed.data.RATE_LIMIT_MAX,
        timeWindow: parsed.data.RATE_LIMIT_WINDOW
    },
    
    redis: {
        node: {
            port: parsed.data.REDIS_PORT, 
            host: parsed.data.REDIS_HOST,
            username: parsed.data.REDIS_USERNAME,
            password: parsed.data.REDIS_PASSWORD,
        },
        cluster: {
            nodes: parsed.data.REDIS_CLUSTER_NODES,
            password: parsed.data.REDIS_PASSWORD,
        }
    },

    supabase: {
        url: parsed.data.SUPABASE_URL,
        serviceRoleKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY
    },

    smtp: {
        host: parsed.data.SMTP_HOST,
        port: parsed.data.SMTP_PORT,
        secure: parsed.data.SMTP_SECURE === true,
        user: parsed.data.SMTP_USER,
        pass: parsed.data.SMTP_PASSWORD,
        fromAddress: parsed.data.SMTP_FROM_ADDRESS,
        fromName: parsed.data.SMTP_FROM_NAME,
    },

    twilio: {
        accountSid: parsed.data.TWILIO_ACCOUNT_SID,
        authToken: parsed.data.TWILIO_AUTH_TOKEN,
        fromNumber: parsed.data.TWILIO_FROM_NUMBER,
        messagingId: parsed.data.TWILIO_MESSAGING_ID,
    },

    firebase: {
        projectId: parsed.data.FIREBASE_PROJECT_ID,
        clientEmail: parsed.data.FIREBASE_CLIENT_EMAIL,
        privateKey: parsed.data.FIREBASE_PRIVATE_KEY,
    },

    stripe: {
        secretKey: parsed.data.STRIPE_SECRET_KEY,
        webhookSecret: parsed.data.STRIPE_WEBHOOK_SECRET,
        currency: parsed.data.STRIPE_DEFAULT_CURRENCY
    },

    google: {
        mapsApiKey: parsed.data.GOOGLE_MAPS_API_KEY,
        url: parsed.data.GOOGLE_MAPS_URL
    },
};