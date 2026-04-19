import { createEnv } from "@t3-oss/env-nextjs"
import z from "zod"

export const env = createEnv({
    server: {
        // DB_PASSWORD: z.string().min(1),
        // DB_HOST: z.string().min(1),
        // DB_PORT: z.string().min(1),
        // DB_USER: z.string().min(1),
        // DB_NAME: z.string().min(1),
        APP_URL: z.string().min(1),
        AWS_ACCESS_KEY_ID: z.string().min(1),
        AWS_SECRET_ACCESS_KEY: z.string().min(1),
        AWS_ENDPOINT_URL_S3: z.string().min(1),
        AWS_REGION: z.string().min(1),
        AWS_S3_BUCKET: z.string().min(1),
        STRIPE_SECRET_KEY: z.string().min(1),
        STRIPE_WEBHOOK_SECRET: z.string().min(1),
        HUME_API_KEY: z.string().min(1),
        HUME_SECRET_KEY: z.string().min(1),
        GEMINI_API_KEY: z.string().min(1),
        FIREBASE_PROJECT_ID: z.string().min(1),
        FIREBASE_CLIENT_EMAIL: z.string().min(1),
        FIREBASE_PRIVATE_KEY: z.string().min(1),
        TWILIO_ACCOUNT_SID: z.string().min(1),
        TWILIO_AUTH_TOKEN: z.string().min(1),
        TWILIO_FROM_NUMBER: z.string().min(1),
        TWILIO_MESSAGING_ID: z.string().min(1),
        SMTP_HOST: z.string().min(1),
        SMTP_PORT: z.string().transform(Number),
        SMTP_SECURE: z.string().transform(Boolean),
        SMTP_USER: z.string().min(1),
        SMTP_PASSWORD: z.string().min(1),
        SMTP_FROM_ADDRESS: z.string().min(1),
        SMTP_FROM_NAME: z.string().min(1),
        WEB_PUSH_VAPID_PRIVATE_KEY: z.string().min(1),
    },
    createFinalSchema: env => {
        return z.object(env).transform(val => {
            return val
        })
    },
    emptyStringAsUndefined: true,
    experimental__runtimeEnv: process.env,
})