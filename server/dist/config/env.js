"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('production'),
    PORT: zod_1.z.string().transform(Number).default(3000),
    HOST: zod_1.z.string().default('0.0.0.0'),
    APP_URL: zod_1.z.string().optional(),
    CORS_ORIGIN: zod_1.z.string().default('*'),
    LOG_LEVEL: zod_1.z.string().default('info'),
    REDIS_CLUSTER: zod_1.z.string().transform(Boolean).default(false),
    JWT_SECRET: zod_1.z.string(),
    JWT_EXPIRES_IN: zod_1.z.string().transform(Number).default(60 * 60 * 24),
    RATE_LIMIT_MAX: zod_1.z.string().transform(Number).default(100),
    RATE_LIMIT_WINDOW: zod_1.z.string().transform(Number).default(60000),
    REDIS_CLUSTER_NODES: zod_1.z.string().transform(Number).default(1),
    REDIS_HOST: zod_1.z.string(),
    REDIS_PORT: zod_1.z.string().transform(Number).default(6379),
    REDIS_USERNAME: zod_1.z.string(),
    REDIS_PASSWORD: zod_1.z.string(),
    SUPABASE_URL: zod_1.z.string(),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string(),
    SMTP_HOST: zod_1.z.string(),
    SMTP_PORT: zod_1.z.string().transform(Number),
    SMTP_SECURE: zod_1.z.string().transform(Boolean),
    SMTP_USER: zod_1.z.string(),
    SMTP_PASSWORD: zod_1.z.string(),
    SMTP_FROM_ADDRESS: zod_1.z.string(),
    SMTP_FROM_NAME: zod_1.z.string(),
    TWILIO_ACCOUNT_SID: zod_1.z.string(),
    TWILIO_AUTH_TOKEN: zod_1.z.string(),
    TWILIO_FROM_NUMBER: zod_1.z.string(),
    TWILIO_MESSAGING_ID: zod_1.z.string(),
    FIREBASE_PROJECT_ID: zod_1.z.string(),
    FIREBASE_CLIENT_EMAIL: zod_1.z.string(),
    FIREBASE_PRIVATE_KEY: zod_1.z.string(),
    STRIPE_SECRET_KEY: zod_1.z.string(),
    STRIPE_WEBHOOK_SECRET: zod_1.z.string(),
    STRIPE_DEFAULT_CURRENCY: zod_1.z.string().default('cad'),
    GOOGLE_MAPS_API_KEY: zod_1.z.string(),
    GOOGLE_MAPS_URL: zod_1.z.string(),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}
exports.config = {
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    host: parsed.data.HOST,
    appUrl: parsed.data.APP_URL ?? `http://localhost:${parsed.data.PORT}`,
    corsOrigin: '*',
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
//# sourceMappingURL=env.js.map