import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@/data/env/server";

export const s3Client = new S3Client({
    region: env.AWS_REGION,
    credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
    ...(env.AWS_ENDPOINT_URL_S3 && { endpoint: env.AWS_ENDPOINT_URL_S3, forcePathStyle: true }),
});