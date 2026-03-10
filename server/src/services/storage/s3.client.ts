import { S3Client } from "@aws-sdk/client-s3";
import { config } from "../../config/env";

export const s3Client = new S3Client({
    region: config.aws.region,
    credentials: {
        accessKeyId: config.aws.accessKey,
        secretAccessKey: config.aws.secretKey,
    },
    ...(config.aws.endpoint && { endpoint: config.aws.endpoint, forcePathStyle: true }),
});