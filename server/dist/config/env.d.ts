export declare const config: {
    nodeEnv: "development" | "production" | "test";
    port: number;
    host: string;
    appUrl: string;
    corsOrigin: string;
    logLevel: string;
    redisCluster: boolean;
    jwt: {
        secret: string;
        expiresIn: number;
    };
    rateLimit: {
        max: number;
        timeWindow: number;
    };
    redis: {
        node: {
            port: number;
            host: string;
            username: string;
            password: string;
        };
        cluster: {
            nodes: number;
            password: string;
        };
    };
    supabase: {
        url: string;
        serviceRoleKey: string;
    };
    smtp: {
        host: string;
        port: number;
        secure: boolean;
        user: string;
        pass: string;
        fromAddress: string;
        fromName: string;
    };
    twilio: {
        accountSid: string;
        authToken: string;
        fromNumber: string;
        messagingId: string;
    };
    firebase: {
        projectId: string;
        clientEmail: string;
        privateKey: string;
    };
    stripe: {
        secretKey: string;
        webhookSecret: string;
        currency: string;
    };
    google: {
        mapsApiKey: string;
        url: string;
    };
    aws: {
        region: string;
        accessKey: string;
        secretKey: string;
        s3Bucket: string;
        endpoint: string;
    };
};
