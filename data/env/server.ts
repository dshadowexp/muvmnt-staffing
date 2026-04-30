import { createEnv } from "@t3-oss/env-nextjs"
import z from "zod"

export const env = createEnv({
    server: {
        NODE_ENV: z.string().min(1),
        APP_URL: z.string().min(1),
        AWS_ACCESS_KEY_ID: z.string().min(1),
        AWS_SECRET_ACCESS_KEY: z.string().min(1),
        AWS_ENDPOINT_URL_S3: z.string().min(1),
        AWS_REGION: z.string().min(1),
        AWS_S3_BUCKET: z.string().min(1),
        STRIPE_SECRET_KEY: z.string().min(1),
        STRIPE_WEBHOOK_SECRET: z.string().min(1),
        STRIPE_PRICE_ID_STARTER: z.string().min(1),
        STRIPE_PRICE_ID_PRO: z.string().min(1),
        STRIPE_PRICE_ID_ENTERPRISE: z.string().min(1),
        STRIPE_PRICE_ID_STARTER_ANNUAL: z.string().min(1),
        STRIPE_PRICE_ID_PRO_ANNUAL: z.string().min(1),
        STRIPE_PRICE_ID_ENTERPRISE_ANNUAL: z.string().min(1),
        HUME_API_KEY: z.string().min(1),
        HUME_SECRET_KEY: z.string().min(1),
        GEMINI_API_KEY: z.string().min(1),
        FIREBASE_PROJECT_ID: z.string().min(1),
        FIREBASE_CLIENT_EMAIL: z.string().min(1),
        FIREBASE_PRIVATE_KEY: z.string().min(1),
        RESEND_API_KEY: z.string().min(1),
        ARCJET_KEY: z.string().min(1),
        SHIFT_RESPONSE_TOKEN_SECRET: z.string().min(1),
        GOOGLE_OAUTH_CLIENT_ID: z.string().min(1),
        GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1),
        GOOGLE_OAUTH_REDIRECT_URL: z.string().min(1),
        LINKEDIN_CLIENT_ID: z.string().min(1),
        LINKEDIN_CLIENT_SECRET: z.string().min(1),
    },
    createFinalSchema: env => {
        return z.object(env).transform(val => {
            return val
        })
    },
    emptyStringAsUndefined: true,
    experimental__runtimeEnv: process.env,
})